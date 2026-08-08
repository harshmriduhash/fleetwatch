import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Eye, EyeOff } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useFleet";
import { useRole, type Role } from "@/hooks/useRole";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Fleetwatch" },
      { name: "description", content: "Workspace, ingest keys, team and on-call rotation." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { user } = useAuth();
  const { data: ws } = useWorkspace();
  const { can } = useRole();
  const qc = useQueryClient();
  const canManageMembers = can("members:manage");
  const canViewKeys = can("keys:view");
  const workspaceId = ws?.workspace.id;
  const [reveal, setReveal] = useState(false);

  const { data: keys = [] } = useQuery({
    queryKey: ["ingest-keys", workspaceId],
    enabled: !!workspaceId && canViewKeys,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ingest_keys")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .is("revoked_at", null);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_members")
        .select("user_id, role")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      const ids = (data ?? []).map((m) => m.user_id);
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("id, email, full_name").in("id", ids)
        : { data: [] };
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      return (data ?? []).map((m) => ({ ...m, profile: byId.get(m.user_id) ?? null }));
    },
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ["oncall", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("oncall_schedules")
        .select("*")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const changeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Role }) => {
      const { error } = await supabase
        .from("workspace_members")
        .update({ role })
        .eq("workspace_id", workspaceId!)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role updated.");
      qc.invalidateQueries({ queryKey: ["members", workspaceId] });
      qc.invalidateQueries({ queryKey: ["workspace"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const key = keys[0]?.token ?? "";

  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" sub={ws?.workspace.name ?? "Workspace"} />

      <section className="panel mb-4 p-5">
        <h2 className="text-sm font-medium">Ingest key</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Send this in the <span className="font-mono">x-fleetwatch-key</span> header from your OTel
          exporter. Treat it like a production credential.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <code className="flex-1 truncate rounded-md border border-border bg-background px-3 py-2 font-mono text-xs">
            {key ? (reveal ? key : `${key.slice(0, 8)}${"•".repeat(24)}`) : "No key yet"}
          </code>
          <Button variant="outline" size="sm" onClick={() => setReveal((v) => !v)}>
            {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            <span className="sr-only">{reveal ? "Hide key" : "Reveal key"}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!key}
            onClick={() => {
              navigator.clipboard.writeText(key);
              toast.success("Ingest key copied.");
            }}
          >
            <Copy className="size-4" />
            <span className="sr-only">Copy key</span>
          </Button>
        </div>
      </section>

      <section className="panel mb-4 p-5">
        <h2 className="text-sm font-medium">Team</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Owners and admins manage agents, SLAs, canaries, ingest keys and approve postmortems.
          Members respond to incidents and write postmortems. A workspace always keeps one owner.
        </p>
        <div className="mt-4 divide-y divide-border">
          {members.map((m) => (
            <div key={m.user_id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm">
                  {m.profile?.full_name || m.profile?.email || "Member"}
                  {m.user_id === user?.id && (
                    <span className="ml-2 text-xs text-muted-foreground">you</span>
                  )}
                </p>
                <p className="truncate font-mono text-[11px] text-muted-foreground">
                  {m.profile?.email}
                </p>
              </div>
              {canManageMembers ? (
                <Select
                  value={m.role}
                  onValueChange={(role) =>
                    changeRole.mutate({ userId: m.user_id, role: role as Role })
                  }
                >
                  <SelectTrigger className="w-32" aria-label={`Role for ${m.profile?.email ?? "member"}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">owner</SelectItem>
                    <SelectItem value="admin">admin</SelectItem>
                    <SelectItem value="member">member</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="outline" className="font-mono text-[11px]">
                  {m.role}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </section>


      <section className="panel p-5">
        <h2 className="text-sm font-medium">On-call</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          When an incident opens, the current responder is paged. Unacknowledged after the escalation
          delay, the next person is paged and the escalation is written to the timeline.
        </p>
        <div className="mt-4 space-y-2">
          {schedules.map((s) => {
            const policy = s.escalation_policy as { escalate_after_minutes?: number } | null;
            return (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2.5"
              >
                <div>
                  <p className="text-sm">{s.name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    escalates after {policy?.escalate_after_minutes ?? 10}m unacknowledged
                  </p>
                </div>
                <Badge variant="outline" className="text-[11px]">
                  {s.is_active ? "active" : "paused"}
                </Badge>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
