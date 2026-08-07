import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Radar } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { StatusDot } from "@/components/status";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAgents, useIncidents, useWorkspace } from "@/hooks/useFleet";

export const Route = createFileRoute("/app/incidents/")({
  head: () => ({
    meta: [
      { title: "Incidents — Fleetwatch" },
      { name: "description", content: "Open, acknowledged and resolved agent incidents." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Incidents,
});

const SEV: Record<string, string> = {
  high: "border-incident/30 bg-incident/10 text-incident",
  medium: "border-degraded/30 bg-degraded/10 text-degraded",
  low: "border-border bg-surface text-muted-foreground",
};

export function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function duration(from: string, to: string | null) {
  const ms = (to ? new Date(to).getTime() : Date.now()) - new Date(from).getTime();
  const m = Math.max(1, Math.round(ms / 60000));
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

function Incidents() {
  const { data: ws } = useWorkspace();
  const { data: agents = [] } = useAgents(ws?.workspace.id);
  const agentIds = useMemo(() => agents.map((a) => a.id), [agents]);
  const { data: incidents = [], isLoading } = useIncidents(agentIds);
  const [tab, setTab] = useState<"active" | "resolved" | "all">("active");

  const names = useMemo(
    () => Object.fromEntries(agents.map((a) => [a.id, a.name])),
    [agents],
  );

  const rows = incidents.filter((i) =>
    tab === "all" ? true : tab === "active" ? i.status !== "resolved" : i.status === "resolved",
  );

  return (
    <div>
      <PageHeader
        title="Incidents"
        sub="Every SLA breach, heartbeat loss and canary failure, with the clock running."
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-5">
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Radar className="size-5 animate-spin text-primary" aria-label="Loading incidents" />
        </div>
      ) : rows.length === 0 ? (
        <div className="panel px-6 py-16 text-center">
          <StatusDot state="healthy" />
          <h2 className="mt-3 text-lg font-medium">
            {tab === "resolved" ? "No resolved incidents yet" : "No active incidents"}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            The fleet is meeting its SLAs. Incidents open automatically when a threshold is breached
            for its full window.
          </p>
        </div>
      ) : (
        <div className="panel divide-y divide-border overflow-hidden">
          {rows.map((i) => (
            <Link
              key={i.id}
              to="/app/incidents/$incidentId"
              params={{ incidentId: i.id }}
              className="flex flex-wrap items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface"
            >
              <StatusDot
                state={i.status === "resolved" ? "healthy" : i.status === "open" ? "incident" : "degraded"}
                pulse={i.status === "open"}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{i.title}</p>
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  {names[i.agent_id] ?? "agent"} · opened {relTime(i.opened_at)} ·{" "}
                  {duration(i.opened_at, i.resolved_at)} {i.resolved_at ? "to resolve" : "open"}
                </p>
              </div>
              <Badge variant="outline" className={SEV[i.severity]}>
                {i.severity}
              </Badge>
              <Badge variant="outline" className="font-mono text-[11px]">
                {i.status}
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
