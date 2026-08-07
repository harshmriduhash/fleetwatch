import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/marketing";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Docs — Instrument your agents with OpenTelemetry | Fleetwatch" },
      {
        name: "description",
        content:
          "Send OpenTelemetry GenAI spans to Fleetwatch, define SLAs, configure heartbeats and canaries, and wire up on-call escalation. First span to first page in fifteen minutes.",
      },
      { property: "og:title", content: "Fleetwatch integration docs" },
      {
        property: "og:description",
        content: "OTLP endpoint setup, SLA definitions, heartbeats, canaries and escalation.",
      },
    ],
  }),
  component: Docs,
});

function Code({ children, lang }: { children: string; lang: string }) {
  return (
    <div className="panel overflow-hidden">
      <div className="border-b border-border px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
        {lang}
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-foreground/90">
        <code>{children}</code>
      </pre>
    </div>
  );
}

const SECTIONS = [
  { id: "quickstart", label: "Quickstart" },
  { id: "otlp", label: "OTLP endpoint" },
  { id: "python", label: "Python SDK" },
  { id: "typescript", label: "TypeScript SDK" },
  { id: "heartbeats", label: "Heartbeats" },
  { id: "slas", label: "SLAs" },
  { id: "canaries", label: "Canaries" },
  { id: "oncall", label: "On-call & escalation" },
];

function Docs() {
  return (
    <MarketingShell>
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-[200px_1fr]">
        <aside className="hidden lg:block">
          <nav className="sticky top-24 space-y-1 text-sm">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Contents
            </p>
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
              >
                {s.label}
              </a>
            ))}
          </nav>
        </aside>

        <article className="min-w-0 space-y-14">
          <header>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Documentation</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">Instrumenting your fleet</h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Fleetwatch ingests standard OpenTelemetry spans that follow the GenAI semantic
              conventions. If your agents already emit traces to Langfuse, Arize Phoenix or any OTLP
              collector, adding Fleetwatch is usually a second exporter — not a rewrite.
            </p>
          </header>

          <section id="quickstart" className="space-y-4 scroll-mt-24">
            <h2 className="text-2xl font-semibold tracking-tight">Quickstart</h2>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li>
                <span className="text-foreground">1.</span> Create a workspace — an ingest key is
                generated for you automatically.
              </li>
              <li>
                <span className="text-foreground">2.</span> Register an agent in{" "}
                <span className="font-mono text-foreground">/app/fleet</span> and copy its{" "}
                <span className="font-mono text-foreground">agent_id</span>.
              </li>
              <li>
                <span className="text-foreground">3.</span> Point your exporter at the Fleetwatch
                OTLP endpoint with your ingest key.
              </li>
              <li>
                <span className="text-foreground">4.</span> Set an SLA. The first breach opens an
                incident and pages the on-call responder.
              </li>
            </ol>
          </section>

          <section id="otlp" className="space-y-4 scroll-mt-24">
            <h2 className="text-2xl font-semibold tracking-tight">OTLP endpoint</h2>
            <p className="text-sm text-muted-foreground">
              Any OTLP/HTTP exporter works. Authenticate with the workspace ingest key and tag every
              span with the agent it belongs to.
            </p>
            <Code lang="shell">{`OTEL_EXPORTER_OTLP_ENDPOINT=https://ingest.fleetwatch.app/v1/traces
OTEL_EXPORTER_OTLP_HEADERS="x-fleetwatch-key=fw_live_xxx"
OTEL_RESOURCE_ATTRIBUTES="fleetwatch.agent_id=<agent_id>,service.name=support-agent-prod"`}</Code>
          </section>

          <section id="python" className="space-y-4 scroll-mt-24">
            <h2 className="text-2xl font-semibold tracking-tight">Python</h2>
            <Code lang="python">{`from fleetwatch import Fleetwatch

fw = Fleetwatch(api_key="fw_live_xxx", agent_id="ag_support_prod")

@fw.trace_task(name="resolve_ticket")
def resolve_ticket(ticket):
    result = agent.invoke(ticket)
    # Report the outcome so success-rate SLAs are measurable.
    fw.report(success=result.resolved, tokens=result.usage.total_tokens)
    return result`}</Code>
            <p className="text-sm text-muted-foreground">
              Already using LangGraph or CrewAI with OpenInference? Keep your existing
              instrumentation and just add the Fleetwatch span processor.
            </p>
          </section>

          <section id="typescript" className="space-y-4 scroll-mt-24">
            <h2 className="text-2xl font-semibold tracking-tight">TypeScript</h2>
            <Code lang="typescript">{`import { Fleetwatch } from "@fleetwatch/sdk";

const fw = new Fleetwatch({ apiKey: process.env.FLEETWATCH_KEY!, agentId: "ag_support_prod" });

await fw.task("resolve_ticket", async (span) => {
  const result = await agent.invoke(ticket);
  span.report({ success: result.resolved, tokens: result.usage.totalTokens });
  return result;
});`}</Code>
          </section>

          <section id="heartbeats" className="space-y-4 scroll-mt-24">
            <h2 className="text-2xl font-semibold tracking-tight">Heartbeats</h2>
            <p className="text-sm text-muted-foreground">
              An agent that stops emitting spans is the failure mode nobody catches. Set an expected
              interval per agent; if no span arrives inside the grace window, Fleetwatch opens a{" "}
              <span className="font-mono text-foreground">no_signal</span> incident.
            </p>
            <Code lang="shell">{`curl -X POST https://ingest.fleetwatch.app/v1/heartbeat \\
  -H "x-fleetwatch-key: fw_live_xxx" \\
  -d '{"agent_id":"ag_support_prod"}'`}</Code>
          </section>

          <section id="slas" className="space-y-4 scroll-mt-24">
            <h2 className="text-2xl font-semibold tracking-tight">SLAs</h2>
            <p className="text-sm text-muted-foreground">
              Each SLA is a metric, a comparison, a threshold and a window. Breaches must persist for
              the full window before an incident opens — that is what keeps the pager quiet.
            </p>
            <div className="panel overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Metric</th>
                    <th className="px-4 py-2 font-medium">Default</th>
                    <th className="px-4 py-2 font-medium">Window</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs">
                  <tr className="border-b border-border/60">
                    <td className="px-4 py-2.5">success_rate</td>
                    <td className="px-4 py-2.5">&gt;= 95%</td>
                    <td className="px-4 py-2.5">15m</td>
                  </tr>
                  <tr className="border-b border-border/60">
                    <td className="px-4 py-2.5">p95_latency_ms</td>
                    <td className="px-4 py-2.5">&lt;= 8000</td>
                    <td className="px-4 py-2.5">15m</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5">error_rate</td>
                    <td className="px-4 py-2.5">&lt;= 2%</td>
                    <td className="px-4 py-2.5">15m</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section id="canaries" className="space-y-4 scroll-mt-24">
            <h2 className="text-2xl font-semibold tracking-tight">Synthetic canaries</h2>
            <p className="text-sm text-muted-foreground">
              A canary is a known input with an expected output, replayed on a schedule against the
              live agent. It detects silent degradation on low-traffic agents where real-traffic
              metrics are too sparse to be trustworthy.
            </p>
            <Code lang="json">{`{
  "name": "refund policy question",
  "input": "How do I get a refund for an order placed 40 days ago?",
  "expect_contains": ["30-day", "not eligible"],
  "schedule": "*/30 * * * *"
}`}</Code>
          </section>

          <section id="oncall" className="space-y-4 scroll-mt-24">
            <h2 className="text-2xl font-semibold tracking-tight">On-call and escalation</h2>
            <p className="text-sm text-muted-foreground">
              Each workspace has a rotation. When an incident opens, the current responder is paged.
              If nobody acknowledges within the escalation delay (10 minutes by default), the next
              person in the rotation is paged, and the escalation is written to the incident
              timeline.
            </p>
          </section>
        </article>
      </div>
    </MarketingShell>
  );
}
