import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  BellRing,
  CheckCircle2,
  FileText,
  Loader2,
  MessageSquarePlus,
  Radar,
  Siren,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { duration, stamp } from "@/lib/time";
import { draftPostmortem } from "@/lib/postmortem.functions";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/app/incidents/$incidentId")({
  head: () => ({
    meta: [
      { title: "Incident — Fleetwatch" },
      { name: "description", content: "Incident timeline, acknowledgement and postmortem." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: IncidentDetail,
});

type EventType = Database["public"]["Enums"]["incident_event_type"];

const EVENT_META: Record<EventType, { icon: typeof Siren; label: string; tone: string }> = {
  breach_detected: { icon: Siren, label: "SLA breach detected", tone: "text-incident" },
  paged: { icon: BellRing, label: "Responder paged", tone: "text-degraded" },
  acknowledged: { icon: CheckCircle2, label: "Acknowledged", tone: "text-primary" },
  note: { icon: MessageSquarePlus, label: "Note", tone: "text-muted-foreground" },
  resolved: { icon: CheckCircle2, label: "Resolved", tone: "text-healthy" },
  canary_failed: { icon: Siren, label: "Canary failed", tone: "text-incident" },
  postmortem_drafted: { icon: FileText, label: "Postmortem drafted", tone: "text-primary" },
  postmortem_submitted: {
    icon: FileText,
    label: "Postmortem submitted for review",
    tone: "text-degraded",
  },
  postmortem_approved: { icon: CheckCircle2, label: "Postmortem approved", tone: "text-healthy" },
  postmortem_changes_requested: {
    icon: MessageSquarePlus,
    label: "Changes requested on postmortem",
    tone: "text-degraded",
  },
  postmortem_published: { icon: FileText, label: "Postmortem published", tone: "text-healthy" },
};

const REVIEW_LABEL: Record<string, string> = {
  not_started: "not submitted",
  in_review: "in review",
  changes_requested: "changes requested",
  approved: "approved",
};


function useIncident(id: string) {
  return useQuery({
    queryKey: ["incident", id],
    refetchInterval: 20_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incidents")
        .select("*, agents(name, framework)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

function useTimeline(id: string) {
  return useQuery({
    queryKey: ["incident-events", id],
    refetchInterval: 20_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incident_events")
        .select("*")
        .eq("incident_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function IncidentDetail() {
  const { incidentId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { can } = useRole();
  const { data: incident, isLoading } = useIncident(incidentId);
  const { data: events = [] } = useTimeline(incidentId);
  const [note, setNote] = useState("");
  const [postmortem, setPostmortem] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [drafting, setDrafting] = useState(false);


  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["incident", incidentId] });
    qc.invalidateQueries({ queryKey: ["incident-events", incidentId] });
    qc.invalidateQueries({ queryKey: ["incidents"] });
  };

  const addEvent = async (event_type: EventType, payload: Record<string, string | undefined> = {}) => {
    const { error } = await supabase.from("incident_events").insert({
      incident_id: incidentId,
      event_type,
      payload: JSON.parse(JSON.stringify(payload)),
      created_by: user?.id ?? null,
    });
    if (error) throw error;
  };

  const acknowledge = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("incidents")
        .update({
          status: "acknowledged",
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: user?.id ?? null,
        })
        .eq("id", incidentId);
      if (error) throw error;
      await addEvent("acknowledged", { by: user?.email });
    },
    onSuccess: () => {
      toast.success("Acknowledged. The escalation clock is stopped.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resolve = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("incidents")
        .update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id ?? null,
        })
        .eq("id", incidentId);
      if (error) throw error;
      await addEvent("resolved", { by: user?.email });
      if (incident?.agent_id) {
        await supabase.from("agents").update({ status: "healthy" }).eq("id", incident.agent_id);
      }
    },
    onSuccess: () => {
      toast.success("Incident resolved. Draft a postmortem while it's fresh.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveNote = useMutation({
    mutationFn: async () => {
      await addEvent("note", { text: note, by: user?.email });
    },
    onSuccess: () => {
      setNote("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function onDraft() {
    if (!incident) return;
    setDrafting(true);
    try {
      const res = await draftPostmortem({
        data: {
          title: incident.title,
          agentName: incident.agents?.name ?? "agent",
          severity: incident.severity,
          openedAt: incident.opened_at,
          resolvedAt: incident.resolved_at,
          timeline: events.map((e) => ({
            at: e.created_at,
            type: e.event_type,
            detail: JSON.stringify(e.payload),
          })),
        },
      });
      if (!res.draft) {
        toast.error(res.error ?? "Could not draft a postmortem.");
        return;
      }
      setPostmortem(res.draft);
      await supabase
        .from("incidents")
        .update({ postmortem_draft: res.draft })
        .eq("id", incidentId);
      await addEvent("postmortem_drafted", { by: user?.email });
      refresh();
      toast.success("Draft ready — review and edit before publishing.");
    } finally {
      setDrafting(false);
    }
  }

  const saveDraft = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("incidents")
        .update({ postmortem_final: postmortem ?? incident?.postmortem_draft ?? null })
        .eq("id", incidentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Postmortem saved.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submitForReview = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("incidents")
        .update({
          postmortem_final: postmortem ?? incident?.postmortem_draft ?? null,
          review_status: "in_review",
          review_notes: null,
        })
        .eq("id", incidentId);
      if (error) throw error;
      await addEvent("postmortem_submitted", { by: user?.email });
    },
    onSuccess: () => {
      toast.success("Submitted. An owner or admin will review it.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const review = useMutation({
    mutationFn: async (decision: "approved" | "changes_requested") => {
      const { error } = await supabase
        .from("incidents")
        .update({
          review_status: decision,
          review_notes: decision === "changes_requested" ? reviewNote.trim() || null : null,
        })
        .eq("id", incidentId);
      if (error) throw error;
      await addEvent(
        decision === "approved" ? "postmortem_approved" : "postmortem_changes_requested",
        { by: user?.email, text: decision === "changes_requested" ? reviewNote : undefined },
      );
    },
    onSuccess: (_d, decision) => {
      setReviewNote("");
      toast.success(decision === "approved" ? "Postmortem approved." : "Changes requested.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const publish = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("incidents")
        .update({
          postmortem_final: postmortem ?? incident?.postmortem_draft ?? null,
          published: true,
        })
        .eq("id", incidentId);
      if (error) throw error;
      await addEvent("postmortem_published", { by: user?.email });
    },
    onSuccess: () => {
      toast.success("Postmortem published to the workspace.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });


  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Radar className="size-5 animate-spin text-primary" aria-label="Loading incident" />
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="panel px-6 py-16 text-center">
        <h1 className="text-lg font-medium">Incident not found</h1>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/app/incidents">Back to incidents</Link>
        </Button>
      </div>
    );
  }

  const body = postmortem ?? incident.postmortem_final ?? incident.postmortem_draft ?? "";
  const canWrite = can("postmortem:write");
  const canReview = can("postmortem:review");
  const canPublish = can("postmortem:publish");
  const canRespond = can("incident:respond");
  const locked = incident.review_status === "approved" || incident.published;


  return (
    <div>
      <button
        onClick={() => navigate({ to: "/app/incidents" })}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Incidents
      </button>

      <PageHeader
        title={incident.title}
        sub={`${incident.agents?.name ?? "agent"} · open for ${duration(incident.opened_at, incident.resolved_at)} · severity ${incident.severity}`}
        action={
          <div className="flex gap-2">
            {incident.status === "open" && canRespond && (
              <Button onClick={() => acknowledge.mutate()} disabled={acknowledge.isPending}>
                Acknowledge
              </Button>
            )}
            {incident.status !== "resolved" && canRespond && (
              <Button
                variant="outline"
                onClick={() => resolve.mutate()}
                disabled={resolve.isPending}
              >
                Resolve
              </Button>
            )}
            <Badge variant="outline" className="self-center font-mono text-[11px]">
              {incident.status}
            </Badge>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <section className="panel p-5">
          <h2 className="text-sm font-medium">Timeline</h2>
          <ol className="mt-5 space-y-5">
            {events.length === 0 && (
              <li className="text-sm text-muted-foreground">No events recorded yet.</li>
            )}
            {events.map((e) => {
              const meta = EVENT_META[e.event_type];
              const Icon = meta.icon;
              const payload = e.payload as Record<string, unknown>;
              return (
                <li key={e.id} className="relative flex gap-3 pl-1">
                  <span className="mt-0.5">
                    <Icon className={`size-4 ${meta.tone}`} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm">{meta.label}</p>
                    {typeof payload["text"] === "string" && (
                      <p className="mt-1 text-sm text-muted-foreground">{payload["text"]}</p>
                    )}
                    {typeof payload["detail"] === "string" && (
                      <p className="mt-1 text-sm text-muted-foreground">{payload["detail"]}</p>
                    )}
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                      {stamp(e.created_at)}
                      {typeof payload["by"] === "string" ? ` · ${payload["by"]}` : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="mt-6 border-t border-border pt-4">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note to the timeline — what you checked, what you changed."
              rows={3}
            />
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              disabled={!note.trim() || saveNote.isPending}
              onClick={() => saveNote.mutate()}
            >
              Add note
            </Button>
          </div>
        </section>

        <section className="panel flex flex-col p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium">Postmortem</h2>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-[11px]">
                {REVIEW_LABEL[incident.review_status] ?? incident.review_status}
              </Badge>
              {canWrite && (
                <Button size="sm" variant="outline" onClick={onDraft} disabled={drafting}>
                  {drafting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  Draft with AI
                </Button>
              )}
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            The draft is summarised from the timeline above. You own the analysis — it must be
            reviewed and approved by an owner or admin before it can be published.
          </p>

          {incident.review_status === "changes_requested" && incident.review_notes && (
            <p className="mt-3 rounded-md border border-border bg-surface px-3 py-2 text-xs text-degraded">
              Reviewer asked for changes: {incident.review_notes}
            </p>
          )}

          <Textarea
            value={body}
            onChange={(e) => setPostmortem(e.target.value)}
            rows={14}
            readOnly={!canWrite || locked}
            className="mt-4 flex-1 font-mono text-xs"
            placeholder="Summary, impact, timeline, root cause, action items…"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {canWrite && !locked && (
              <>
                <Button size="sm" onClick={() => saveDraft.mutate()} disabled={!body || saveDraft.isPending}>
                  Save draft
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => submitForReview.mutate()}
                  disabled={!body || submitForReview.isPending}
                >
                  Submit for review
                </Button>
              </>
            )}
            {incident.review_status === "approved" && !incident.published && canPublish && (
              <Button size="sm" onClick={() => publish.mutate()} disabled={publish.isPending}>
                Publish
              </Button>
            )}
            {incident.published && (
              <Badge variant="outline" className="self-center text-[11px] text-healthy">
                published
              </Badge>
            )}
          </div>

          {incident.review_status === "in_review" && (
            <div className="mt-4 border-t border-border pt-4">
              {canReview ? (
                <>
                  <p className="text-xs font-medium">Review</p>
                  <Textarea
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    rows={2}
                    className="mt-2 text-xs"
                    placeholder="What needs to change before this is approved? (required to request changes)"
                  />
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => review.mutate("approved")}
                      disabled={review.isPending}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => review.mutate("changes_requested")}
                      disabled={review.isPending || !reviewNote.trim()}
                    >
                      Request changes
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Waiting on an owner or admin to review this postmortem.
                </p>
              )}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
