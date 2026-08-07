import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Plus, Radar, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { StatusPill, type HealthState } from "@/components/status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { relTime, stamp } from "@/lib/time";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/app/agents/$agentId")({
  head: () => ({
    meta: [
      { title: "Agent — Fleetwatch" },
      { name: "description", content: "Agent health, SLAs, canaries and recent spans." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AgentDetail,
});

type Metric = Database["public"]["Enums"]["sla_metric"];

const METRIC_LABEL: Record<Metric, { label: string; unit: string; dir: string }> = {
  success_rate: { label: "Task success rate", unit: "%", dir: "at least" },
  p95_latency: { label: "p95 latency", unit: "ms", dir: "at most" },
  error_rate: { label: "Error rate", unit: "%", dir: "at most" },
};

function AgentDetail() {
  const { agentId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: agent, isLoading } = useQuery({
    queryKey: ["agent", agentId],
    refetchInterval: 20_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .eq("id", agentId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: slas = [] } = useQuery({
    queryKey: ["slas", agentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sla_configs")
        .select("*")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: spans = [] } = useQuery({
    queryKey: ["spans", agentId],
    refetchInterval: 20_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spans")
        .select("*")
        .eq("agent_id", agentId)
        .order("started_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: canaries = [] } = useQuery({
    queryKey: ["canaries", agentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("canaries")
        .select("*")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ["agent-incidents", agentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incidents")
        .select("*")
        .eq("agent_id", agentId)
        .order("opened_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return data ?? [];
    },
  });

  const [newMetric, setNewMetric] = useState<Metric>("success_rate");
  const [threshold, setThreshold] = useState("95");
  const [windowMin, setWindowMin] = useState("15");

  const addSla = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("sla_configs").insert({
        agent_id: agentId,
        metric: newMetric,
        threshold: Number(threshold),
        window_minutes: Number(windowMin),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("SLA added.");
      qc.invalidateQueries({ queryKey: ["slas", agentId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleSla = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("sla_configs")
        .update({ is_active: active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["slas", agentId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const removeSla = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sla_configs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["slas", agentId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const [canaryName, setCanaryName] = useState("");
  const [canaryInput, setCanaryInput] = useState("");
  const addCanary = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("canaries").insert({
        agent_id: agentId,
        name: canaryName,
        payload: { input: canaryInput },
        schedule_cron: "*/30 * * * *",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Canary scheduled every 30 minutes.");
      setCanaryName("");
      setCanaryInput("");
      qc.invalidateQueries({ queryKey: ["canaries", agentId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Radar className="size-5 animate-spin text-primary" aria-label="Loading agent" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="panel px-6 py-16 text-center">
        <h1 className="text-lg font-medium">Agent not found</h1>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/app/fleet">Back to fleet</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => navigate({ to: "/app/fleet" })}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Fleet
      </button>

      <PageHeader
        title={agent.name}
        sub={`${agent.framework} · service ${agent.otel_service_name} · ${
          agent.last_seen_at ? `last span ${relTime(agent.last_seen_at)}` : "no spans received yet"
        }`}
        action={<StatusPill state={agent.status as HealthState} />}
      />

      <Tabs defaultValue="slas">
        <TabsList>
          <TabsTrigger value="slas">SLAs</TabsTrigger>
          <TabsTrigger value="spans">Recent spans</TabsTrigger>
          <TabsTrigger value="canaries">Canaries</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
        </TabsList>

        <TabsContent value="slas" className="mt-5 space-y-4">
          <div className="panel divide-y divide-border">
            {slas.length === 0 && (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                No SLAs defined — this agent is not being monitored.
              </p>
            )}
            {slas.map((s) => {
              const m = METRIC_LABEL[s.metric];
              return (
                <div key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="flex-1">
                    <p className="text-sm">{m.label}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {m.dir} {s.threshold}
                      {m.unit} over {s.window_minutes}m
                    </p>
                  </div>
                  <Switch
                    checked={s.is_active}
                    onCheckedChange={(v) => toggleSla.mutate({ id: s.id, active: v })}
                    aria-label={`Toggle ${m.label} SLA`}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSla.mutate(s.id)}
                    aria-label={`Delete ${m.label} SLA`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="panel p-4">
            <h3 className="text-sm font-medium">Add an SLA</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              A breach must persist for the whole window before an incident opens. That is what keeps
              the pager honest.
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="metric">Metric</Label>
                <Select value={newMetric} onValueChange={(v) => setNewMetric(v as Metric)}>
                  <SelectTrigger id="metric" className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(METRIC_LABEL) as Metric[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {METRIC_LABEL[k].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="threshold">Threshold</Label>
                <Input
                  id="threshold"
                  className="w-28"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="window">Window (min)</Label>
                <Input
                  id="window"
                  className="w-28"
                  value={windowMin}
                  onChange={(e) => setWindowMin(e.target.value)}
                  inputMode="numeric"
                />
              </div>
              <Button onClick={() => addSla.mutate()} disabled={addSla.isPending}>
                <Plus className="size-4" /> Add SLA
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="spans" className="mt-5">
          <div className="panel overflow-x-auto">
            {spans.length === 0 ? (
              <p className="px-4 py-8 text-sm text-muted-foreground">
                No spans received yet. Point an OpenTelemetry exporter at Fleetwatch —{" "}
                <Link to="/docs" className="text-primary hover:underline">
                  see the guide
                </Link>
                .
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Span</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Duration</th>
                    <th className="px-4 py-2 font-medium">When</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs">
                  {spans.map((s) => (
                    <tr key={s.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-2.5">{s.name}</td>
                      <td className="px-4 py-2.5">
                        <span className={s.status_code === "OK" ? "text-healthy" : "text-incident"}>
                          {s.status_code}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">{s.duration_ms}ms</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{stamp(s.started_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="canaries" className="mt-5 space-y-4">
          <div className="panel divide-y divide-border">
            {canaries.length === 0 && (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                No canaries. On a low-traffic agent, real-traffic metrics are too sparse to trust — a
                synthetic probe catches silent degradation.
              </p>
            )}
            {canaries.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1">
                  <p className="text-sm">{c.name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {c.schedule_cron} ·{" "}
                    {c.last_run_at ? `last run ${relTime(c.last_run_at)}` : "not run yet"}
                  </p>
                </div>
                {c.last_result && (
                  <Badge
                    variant="outline"
                    className={c.last_result === "pass" ? "text-healthy" : "text-incident"}
                  >
                    {c.last_result}
                  </Badge>
                )}
              </div>
            ))}
          </div>
          <div className="panel space-y-3 p-4">
            <h3 className="text-sm font-medium">Add a canary</h3>
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Name</Label>
              <Input
                id="c-name"
                value={canaryName}
                onChange={(e) => setCanaryName(e.target.value)}
                placeholder="refund policy question"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-input">Probe input</Label>
              <Input
                id="c-input"
                value={canaryInput}
                onChange={(e) => setCanaryInput(e.target.value)}
                placeholder="How do I get a refund for an order placed 40 days ago?"
              />
            </div>
            <Button
              onClick={() => addCanary.mutate()}
              disabled={!canaryName.trim() || addCanary.isPending}
            >
              <Plus className="size-4" /> Schedule canary
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="incidents" className="mt-5">
          <div className="panel divide-y divide-border">
            {incidents.length === 0 && (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                No incidents recorded for this agent.
              </p>
            )}
            {incidents.map((i) => (
              <Link
                key={i.id}
                to="/app/incidents/$incidentId"
                params={{ incidentId: i.id }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-surface"
              >
                <div className="flex-1">
                  <p className="text-sm">{i.title}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    opened {relTime(i.opened_at)}
                  </p>
                </div>
                <Badge variant="outline" className="font-mono text-[11px]">
                  {i.status}
                </Badge>
              </Link>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
