import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell, SectionHeading } from "@/components/marketing";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog — Operating AI agents in production | Fleetwatch" },
      {
        name: "description",
        content:
          "Field notes on running AI agents like production services: SLAs for non-deterministic systems, incident response for agent failures, and what SRE practice transfers.",
      },
      { property: "og:title", content: "Fleetwatch blog" },
      {
        property: "og:description",
        content: "Field notes on SLAs, paging and incident response for production AI agents.",
      },
    ],
  }),
  component: Blog,
});

const POSTS = [
  {
    title: "What an SLA means when the system is non-deterministic",
    date: "2026-01-12",
    read: "6 min",
    excerpt:
      "You can't promise a specific answer. You can promise a task success rate, a latency ceiling and an error budget — and those are the numbers that actually govern an on-call rotation.",
  },
  {
    title: "The silent failure: agents that stop emitting anything",
    date: "2026-01-05",
    read: "4 min",
    excerpt:
      "Quality dashboards can only grade the traffic they see. The worst outage we investigated produced a perfect success rate — because it produced nothing at all for nine hours.",
  },
  {
    title: "Why eval tooling stops one step short of operations",
    date: "2025-12-18",
    read: "7 min",
    excerpt:
      "Langfuse and Arize answer 'did quality drift'. Nobody is contractually obliged to read that answer. An incident with an owner and a clock is a different kind of object.",
  },
  {
    title: "Postmortems for agent incidents, drafted from the timeline",
    date: "2025-12-02",
    read: "5 min",
    excerpt:
      "The timeline already contains the breach, the acknowledgement, the mitigation and the resolution. Drafting a postmortem from it is summarisation, not authorship — you still own the analysis.",
  },
];

function Blog() {
  return (
    <MarketingShell>
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-5">
          <SectionHeading
            eyebrow="Blog"
            title="Operating AI agents in production"
            sub="Field notes from treating agent fleets like the services they are."
          />
          <div className="mt-14 divide-y divide-border border-y border-border">
            {POSTS.map((p) => (
              <article key={p.title} className="group py-7">
                <div className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
                  <time dateTime={p.date}>
                    {new Date(p.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                  <span>·</span>
                  <span>{p.read}</span>
                </div>
                <h2 className="mt-2 text-xl font-medium tracking-tight transition-colors group-hover:text-primary">
                  {p.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.excerpt}</p>
              </article>
            ))}
          </div>
          <p className="mt-8 text-center text-xs text-muted-foreground">
            More posts coming as the fleet grows.
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
