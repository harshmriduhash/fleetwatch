import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { MarketingShell, SectionHeading } from "@/components/marketing";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Fleetwatch agent uptime monitoring" },
      {
        name: "description",
        content:
          "Fleetwatch pricing: Free for 2 agents, Starter at $299/mo, Growth at $899/mo. On-call rotation, SLA breach detection and postmortems included on every plan.",
      },
      { property: "og:title", content: "Fleetwatch pricing" },
      {
        property: "og:description",
        content: "Free, Starter $299/mo and Growth $899/mo — agent SLAs, paging and postmortems.",
      },
    ],
  }),
  component: Pricing,
});

const PLANS = [
  {
    name: "Free",
    price: "$0",
    tag: "For a first instrumented agent",
    features: [
      "2 agents",
      "7-day span & rollup retention",
      "Unlimited SLA rules",
      "Single responder on-call",
      "Incident timeline & manual postmortems",
    ],
  },
  {
    name: "Starter",
    price: "$299",
    tag: "For a real production fleet",
    popular: true,
    features: [
      "15 agents",
      "30-day retention",
      "Multi-person rotation + escalation policy",
      "Synthetic canaries",
      "AI-drafted postmortems",
      "Email + webhook paging",
    ],
  },
  {
    name: "Growth",
    price: "$899",
    tag: "For platform teams with an SLA to defend",
    features: [
      "Unlimited agents",
      "90-day retention",
      "Opt-in full payload capture",
      "Role-based access (owner/admin/member)",
      "Audit log export",
      "Priority support",
    ],
  },
];

function Pricing() {
  return (
    <MarketingShell>
      <section className="border-b border-border/70 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHeading
            eyebrow="Pricing"
            title="Priced per fleet, not per span"
            sub="Every plan includes SLA breach detection, the incident engine and the on-call rotation. You never pay extra to be paged."
          />
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`panel flex flex-col p-6 ${p.popular ? "border-primary/50 shadow-glow" : ""}`}
              >
                {p.popular && (
                  <span className="mb-3 inline-block w-fit rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                    Most popular
                  </span>
                )}
                <h3 className="font-medium">{p.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{p.tag}</p>
                <p className="mt-4 font-mono text-4xl">
                  {p.price}
                  <span className="text-sm text-muted-foreground">/mo</span>
                </p>
                <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2 text-muted-foreground">
                      <Check className="mt-0.5 size-4 shrink-0 text-healthy" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button asChild className="mt-6" variant={p.popular ? "default" : "outline"}>
                  <Link to="/auth" search={{ mode: "signup" }}>
                    {p.name === "Free" ? "Start free" : `Choose ${p.name}`}
                  </Link>
                </Button>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Beta pricing. Paid plans are activated manually while billing is being finalised — start
            free and we&apos;ll upgrade your workspace without an interruption.
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
