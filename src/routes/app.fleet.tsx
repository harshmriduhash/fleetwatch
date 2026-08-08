import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Radar, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { StatusPill, StatusDot, type HealthState } from "@/components/status";
import { Button } from "@/components/ui/button";
import { useRole } from "@/hooks/useRole";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAgents, useIncidents, useWorkspace, type Agent } from "@/hooks/useFleet";

export const Route = createFileRoute("/app/fleet")({
  head: () => ({
    meta: [
      { title: "Fleet — Fleetwatch" },
      { name: "description", content: "Live health of every monitored agent in your workspace." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Fleet,
});

const FRAMEWORKS = ["LangGraph", "CrewAI", "OpenAI SDK", "Anthropic SDK", "AutoGen", "Custom"];

function useRollups(agentIds: string[]) {
  return useQuery({
    queryKey: ["rollups", agentIds],
    enabled: agentIds.length > 0,
    refetchInterval: 30_000,
    queryFn: async () => {
      const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("metric_rollups")
        .select("agent_id, metric, value, window_start")
        .in("agent_id", agentIds)
        .gte("window_start", since)
        .order("window_start", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length === 0) {
    return (
      <div className="flex h-8 items-center font-mono text-[11px] text-muted-foreground">
        awaiting signal
      </div>
    );
  }
  const max = Math.max(...points, 1);
  return (
    <div className="flex h-8 items-end gap-[3px]" aria-hidden="true">
      {points.slice(-18).map((p, i) => (
        <span
          key={i}
          className="w-1 rounded-sm bg-primary/50"
          style={{ height: `${Math.max(8, (p / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

function AgentTile({
  agent,
  openIncidents,
  points,
  successRate,
}: {
  agent: Agent;
  openIncidents: number;
  points: number[];
  successRate: number | null;
}) {
  const lastSeen = agent.last_seen_at ? new Date(agent.last_seen_at) : null;
  const staleMin = lastSeen ? Math.round((Date.now() - lastSeen.getTime()) / 60000) : null;
  return (
    <Link
      to="/app/agents/$agentId"
      params={{ agentId: agent.id }}
      className="panel block p-4 transition-colors hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-sm">{agent.name}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {agent.framework} ·{" "}
            {staleMin === null ? "no signal yet" : `last span ${staleMin}m ago`}
          </p>
        </div>
        <StatusPill state={agent.status as HealthState} />
      </div>
      <div className="mt-4 flex items-end justify-between">
        <Sparkline points={points} />
        <div className="text-right">
          <p className="font-mono text-sm">
            {successRate === null ? "—" : `${(successRate * 100).toFixed(1)}%`}
          </p>
          <p className="text-[11px] text-muted-foreground">success rate</p>
        </div>
      </div>
      {openIncidents > 0 && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-incident">
          <StatusDot state="incident" pulse /> {openIncidents} open incident
          {openIncidents > 1 ? "s" : ""}
        </p>
      )}
    </Link>
  );
}

function AddAgentDialog({ workspaceId }: { workspaceId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [framework, setFramework] = useState(FRAMEWORKS[0]!);
  const [service, setService] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("agents")
        .insert({
          workspace_id: workspaceId,
          name,
          framework,
          otel_service_name: service || name,
        })
        .select("id")
        .single();
      if (error) throw error;

      // Ship sane default SLAs so a new agent is monitored from minute one.
      const { error: slaErr } = await supabase.from("sla_configs").insert([
        { agent_id: data.id, metric: "success_rate" as const, threshold: 95, window_minutes: 15 },
        { agent_id: data.id, metric: "p95_latency" as const, threshold: 8000, window_minutes: 15 },
        { agent_id: data.id, metric: "error_rate" as const, threshold: 2, window_minutes: 15 },
      ]);
      if (slaErr) throw slaErr;
      return data.id;
    },
    onSuccess: () => {
      toast.success("Agent registered with default SLAs.");
      setOpen(false);
      setName("");
      setService("");
      qc.invalidateQueries({ queryKey: ["agents"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> Add agent
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register an agent</DialogTitle>
          <DialogDescription>
            Default SLAs (95% success, 8s p95, 2% errors over 15 minutes) are applied so it is
            monitored immediately. You can tune them on the agent page.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="agent-name">Agent name</Label>
            <Input
              id="agent-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="support-agent-prod"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="framework">Framework</Label>
            <Select value={framework} onValueChange={setFramework}>
              <SelectTrigger id="framework">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FRAMEWORKS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="service">OTel service name</Label>
            <Input
              id="service"
              value={service}
              onChange={(e) => setService(e.target.value)}
              placeholder="defaults to the agent name"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => create.mutate()}
            disabled={!name.trim() || create.isPending}
          >
            Register agent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Fleet() {
  const { data: ws, isLoading: wsLoading } = useWorkspace();
  const workspaceId = ws?.workspace.id;
  const { data: agents = [], isLoading } = useAgents(workspaceId);
  const agentIds = useMemo(() => agents.map((a) => a.id), [agents]);
  const { data: incidents = [] } = useIncidents(agentIds);
  const { data: rollups = [] } = useRollups(agentIds);
  const [q, setQ] = useState("");

  const byAgent = useMemo(() => {
    const map = new Map<string, { points: number[]; success: number | null }>();
    for (const id of agentIds) map.set(id, { points: [], success: null });
    for (const r of rollups) {
      const entry = map.get(r.agent_id);
      if (!entry) continue;
      if (r.metric === "success_rate") {
        entry.points.push(Number(r.value));
        entry.success = Number(r.value) / 100;
      }
    }
    return map;
  }, [rollups, agentIds]);

  const openByAgent = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of incidents) {
      if (i.status !== "resolved") map.set(i.agent_id, (map.get(i.agent_id) ?? 0) + 1);
    }
    return map;
  }, [incidents]);

  const filtered = agents.filter((a) => a.name.toLowerCase().includes(q.toLowerCase()));
  const counts = {
    healthy: agents.filter((a) => a.status === "healthy").length,
    degraded: agents.filter((a) => a.status === "degraded").length,
    incident: agents.filter((a) => a.status === "incident").length,
  };

  return (
    <div>
      <PageHeader
        title="Fleet"
        sub={
          wsLoading
            ? "Loading workspace…"
            : `${agents.length} agent${agents.length === 1 ? "" : "s"} monitored in ${ws?.workspace.name ?? "your workspace"}`
        }
        action={workspaceId && canCreate ? <AddAgentDialog workspaceId={workspaceId} /> : null}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {(["healthy", "degraded", "incident"] as const).map((s) => (
          <div key={s} className="panel flex items-center justify-between p-4">
            <StatusPill state={s} />
            <span className="font-mono text-2xl">{counts[s]}</span>
          </div>
        ))}
      </div>

      <div className="relative mb-4 max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter agents"
          className="pl-9"
          aria-label="Filter agents"
        />
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Radar className="size-5 animate-spin text-primary" aria-label="Loading agents" />
        </div>
      ) : agents.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 px-6 py-16 text-center">
          <Radar className="size-8 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-medium">No agents yet</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Register your first agent, then point an OpenTelemetry exporter at Fleetwatch. Default
            SLAs start watching it right away.
          </p>
          <div className="mt-2 flex gap-2">
            {workspaceId && canCreate && <AddAgentDialog workspaceId={workspaceId} />}
            <Button asChild variant="outline" size="sm">
              <Link to="/docs">Integration guide</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <AgentTile
              key={a.id}
              agent={a}
              openIncidents={openByAgent.get(a.id) ?? 0}
              points={byAgent.get(a.id)?.points ?? []}
              successRate={byAgent.get(a.id)?.success ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
