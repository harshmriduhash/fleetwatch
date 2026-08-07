import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Activity,
  BellRing,
  FileText,
  GitBranch,
  Radar,
  ShieldCheck,
  TimerReset,
} from "lucide-react";
import { MarketingShell, SectionHeading } from "@/components/marketing";
import { Button } from "@/components/ui/button";
import { StatusPill, StatusDot } from "@/components/status";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fleetwatch — Your agents don't have an SLA. They should." },
      {
        name: "description",
        content:
          "85% of GenAI deployments run with no observability. Fleetwatch adds OpenTelemetry-based uptime tracking, SLAs, paging and AI-drafted postmortems to your production agent fleet.",
      },
      { property: "og:title", content: "Fleetwatch — SLAs and incident response for AI agents" },
      {
        property: "og:description",
        content:
          "OpenTelemetry ingestion, synthetic canaries, SLA breach detection, on-call paging and AI-drafted postmortems for production AI agents.",
      },
    ],
  }),
  component: Landing,
});

const HOW = [
  {
    icon: Radar,
    title: "Instrument with OTel",
    body: "Point any OpenTelemetry or OpenInference exporter at Fleetwatch. Already on Langfuse or Arize? Often just a config change, no new code.",
  },
  {
    icon: Activity,
    title: "Set SLAs",
    body: "Task success rate, p95 latency, error rate. Sensible defaults on day one, data-informed suggestions after a week of real traffic.",
  },
  {
    icon: BellRing,
    title: "Get paged",
    body: "A breach opens an incident, starts a timeline and pages whoever is on call. Unacknowledged in ten minutes? It escalates.",
  },
  {
    icon: FileText,
    title: "Ship the postmortem",
    body: "On resolution the timeline is summarised into a draft postmortem. You review, edit and publish — the record was always yours.",
  },
];

function HeroPreview() {
  const tiles = [
    { name: "support-agent-prod", fw: "LangGraph", state: "healthy" as const, sla: "99.4%" },
    { name: "billing-ops-agent", fw: "CrewAI", state: "degraded" as const, sla: "96.1%" },
    { name: "research-copilot", fw: "OpenAI SDK", state: "incident" as const, sla: "88.7%" },
    { name: "intake-triage", fw: "LangGraph", state: "healthy" as const, sla: "99.9%" },
  ];
  return (
    <div className="panel overflow-hidden shadow-panel">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">/app/fleet</span>
        </div>
        <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <StatusDot state="incident" pulse /> 1 active incident
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
        {tiles.map((t) => (
          <div key={t.name} className="rounded-lg border border-border bg-background/60 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-mono text-[13px]">{t.name}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{t.fw}</p>
              </div>
              <StatusPill state={t.state} />
            </div>
            <div className="mt-3 flex items-end justify-between">
              <div className="flex h-8 items-end gap-[3px]">
                {Array.from({ length: 18 }).map((_, i) => (
                  <span
                    key={i}
                    className="w-1 rounded-sm bg-primary/40"
                    style={{ height: `${25 + ((i * 37) % 70)}%` }}
                  />
                ))}
              </div>
              <span className="font-mono text-xs text-muted-foreground">{t.sla}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Landing() {
  return (
    <MarketingShell>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/70">
        <div className="pointer-events-none absolute inset-0 pulse-grid" aria-hidden="true" />
        <div className="pointer-events-none absolute left-1/2 top-0 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-20 md:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
              <StatusDot state="healthy" pulse /> Built on OpenTelemetry GenAI semantic conventions
            </span>
            <h1 className="animate-rise mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
              Your agents don&apos;t have an SLA.{" "}
              <span className="text-gradient-sky">They should.</span>
            </h1>
            <p className="animate-rise mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground">
              85% of GenAI deployments run with no observability at all. Fleetwatch treats every
              production agent like a monitored service — uptime, SLAs, paging and incident
              postmortems, the discipline SRE teams have had for twenty years.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Start free <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/docs">Read the integration guide</Link>
              </Button>
            </div>
          </div>
          <div className="mx-auto mt-14 max-w-4xl">
            <HeroPreview />
          </div>
        </div>
      </section>

      {/* Stat band */}
      <section className="border-b border-border/70 bg-surface/40">
        <div className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
          {[
            { k: "85%", v: "of GenAI deployments run with no observability at all" },
            { k: "30%+", v: "annual growth in the observability tooling market" },
            { k: "0", v: "eval tools that ship an on-call rotation or incident timeline" },
          ].map((s) => (
            <div key={s.k} className="px-6 py-8">
              <p className="font-mono text-3xl font-semibold text-primary">{s.k}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Problem */}
      <section className="border-b border-border/70 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHeading
            eyebrow="The gap"
            title="Your eval tool tells you quality dropped. Then what?"
            sub="Evaluation tooling produces information that nobody is operationally required to act on. There's no page, no owner, no clock running, no record afterwards. That gap is where agents silently rot in production."
          />
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: TimerReset,
                t: "Nobody finds out for days",
                b: "A support agent starts failing 1 in 4 tasks. It surfaces as a customer complaint, not an alert.",
              },
              {
                icon: GitBranch,
                t: "No defined next step",
                b: "A quality regression becomes a backlog ticket instead of an acknowledged incident with an owner.",
              },
              {
                icon: ShieldCheck,
                t: "No operational record",
                b: "When leadership asks 'is the fleet healthy', the honest answer is a guess.",
              },
            ].map((c) => (
              <div key={c.t} className="panel p-5">
                <c.icon className="size-5 text-primary" aria-hidden="true" />
                <h3 className="mt-4 font-medium">{c.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-border/70 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHeading eyebrow="How it works" title="Instrument. Set SLAs. Get paged. Publish." />
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {HOW.map((h, i) => (
              <div key={h.title} className="panel flex gap-4 p-6">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                  <h.icon className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-mono text-[11px] text-muted-foreground">0{i + 1}</p>
                  <h3 className="mt-1 font-medium">{h.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{h.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Complementary */}
      <section className="border-b border-border/70 bg-surface/40 py-20">
        <div className="mx-auto max-w-4xl px-5 text-center">
          <SectionHeading
            eyebrow="Positioning"
            title="Complementary to Langfuse and Arize, not competing"
            sub="Keep your evaluation stack. Fleetwatch reads the same OpenTelemetry spans your eval tooling already emits and adds the operational half nobody ships: thresholds, paging, incident state and postmortems."
          />
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {["Langfuse", "Arize Phoenix", "OpenInference", "LangGraph", "CrewAI", "OTel Collector"].map(
              (n) => (
                <span
                  key={n}
                  className="rounded-full border border-border bg-background px-4 py-1.5 font-mono text-xs text-muted-foreground"
                >
                  {n}
                </span>
              ),
            )}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="border-b border-border/70 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHeading eyebrow="Pricing" title="Start free. Pay when the fleet grows." />
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              { name: "Free", price: "$0", note: "2 agents, 7-day retention, single responder" },
              { name: "Starter", price: "$299", note: "15 agents, 30-day retention, full rotation", popular: true },
              { name: "Growth", price: "$899", note: "Unlimited agents, 90-day retention, audit export" },
            ].map((p) => (
              <div
                key={p.name}
                className={`panel p-6 ${p.popular ? "border-primary/50 shadow-glow" : ""}`}
              >
                {p.popular && (
                  <span className="mb-3 inline-block rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                    Most popular
                  </span>
                )}
                <h3 className="font-medium">{p.name}</h3>
                <p className="mt-2 font-mono text-3xl">{p.price}<span className="text-sm text-muted-foreground">/mo</span></p>
                <p className="mt-3 text-sm text-muted-foreground">{p.note}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Button asChild variant="outline">
              <Link to="/pricing">Compare plans</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-border/70 py-20">
        <div className="mx-auto max-w-3xl px-5">
          <SectionHeading eyebrow="FAQ" title="The three questions everyone asks" />
          <Accordion type="single" collapsible className="mt-10">
            <AccordionItem value="a">
              <AccordionTrigger>Does this replace Langfuse or Arize?</AccordionTrigger>
              <AccordionContent>
                No. They answer &quot;did quality drift?&quot;. Fleetwatch answers &quot;is it up,
                did it breach its SLA, who is being paged, and what happened?&quot; Most teams run
                both, off the same span stream.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="b">
              <AccordionTrigger>Do we need PagerDuty already?</AccordionTrigger>
              <AccordionContent>
                No. Fleetwatch ships its own lightweight on-call rotation and escalation policy in
                the MVP. Native PagerDuty and Opsgenie integrations are on the roadmap.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="c">
              <AccordionTrigger>What data leaves our infrastructure?</AccordionTrigger>
              <AccordionContent>
                Span metadata only by default — names, durations, status codes, and OTel GenAI
                attributes. Full payload capture is opt-in per workspace, off by default, with its
                own retention window.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            Put your fleet on the same operational bar as everything else you run.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm text-muted-foreground">
            Free to start. First span to first page in under fifteen minutes.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link to="/auth" search={{ mode: "signup" }}>
              Start free <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </MarketingShell>
  );
}
