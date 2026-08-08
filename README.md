<div align="center">

# Fleetwatch

### PagerDuty for AI agents.

**Your agents are in production. Nobody is on call for them.**
Fleetwatch is the uptime, SLA and incident-response layer for production AI agents — built on OpenTelemetry, driven by deterministic thresholds, and answerable to humans.

[Product](#the-product) · [Problem](#the-problem) · [Architecture](#software-architecture) · [Design](#system-design) · [Development](#development)

</div>

---

## Summary

Teams ship AI agents into production, then discover they have no idea when one breaks. Evaluation tools grade *quality* on a sample of traces. Fleetwatch answers a different, more urgent question: **is it up, is it within SLA, and who is fixing it right now?**

Fleetwatch ingests OpenTelemetry spans from your agents, rolls them into success-rate / latency / error-rate metrics, compares them against SLAs you define, and — when a threshold breaks — opens an incident, pages the responder, records the timeline, and drafts a postmortem you review and publish.

No models decide whether you have an incident. Thresholds do. Models only write the first draft of the writeup, and a human always approves it.

---

## The problem

| Today | Cost |
| --- | --- |
| An agent silently degrades at 3am; a customer reports it at 10am | Seven hours of broken output, shipped to users |
| "Is the agent down?" is answered by reading raw logs | 30–90 minutes per investigation, per engineer |
| No SLA definition, so no shared idea of "broken" | Endless debate instead of action |
| Postmortems never get written | The same failure recurs every quarter |
| Eval tools measure quality on samples | They cannot page anyone |

### How Fleetwatch solves it

1. **Standards, not lock-in.** You emit OpenTelemetry. Point your existing exporter at Fleetwatch with one header. No proprietary SDK to marry.
2. **SLAs you declare.** Success rate, p95 latency, error rate — per agent, per window. Sane defaults applied the moment you register an agent.
3. **Deterministic incidents.** A breach is a breach. The state machine is `open → acknowledged → resolved`, and every transition is written to an immutable timeline.
4. **Synthetic canaries.** Scheduled probes catch the failure before your users do, on the agents nobody is currently exercising.
5. **Postmortems that actually ship.** AI writes the draft from the real timeline; a reviewer approves it; the database refuses to publish anything unapproved.

### Does it save time and money?

| Metric | Before | With Fleetwatch |
| --- | --- | --- |
| Time to detect a degraded agent | Hours to days | Minutes (SLA window) |
| Time to first responder action | Whenever someone notices | Immediate page + in-app notification |
| Time to write a postmortem | 2–4 hours, usually never | ~10 minutes to review a draft |
| Cost of a silent failure | Bad output at production volume | Bounded by the SLA window |

For a five-engineer team running a handful of agents, that is single-digit hours per incident recovered and — far more valuable — bad output contained to minutes instead of a workday.

---

## The product

| Surface | What it does |
| --- | --- |
| **Fleet dashboard** | Every agent, live status, success-rate sparkline, last-seen heartbeat |
| **Agent detail** | SLA management, recent OTel spans, synthetic canaries, incident history |
| **Incident workspace** | Timeline of automated and human events, acknowledge / resolve, notes |
| **Postmortem review** | AI draft → submit → approve or request changes → publish |
| **Notifications** | In-app bell fed by database triggers: opened, paged, acknowledged, resolved, review state changes |
| **Settings** | Ingest key, team and roles, on-call rotation and escalation policy |
| **Marketing + docs** | Landing, pricing, integration guide with Python and TypeScript snippets, blog |

### Roles

| Capability | Owner | Admin | Member |
| --- | :---: | :---: | :---: |
| Respond to incidents, write postmortems | ✅ | ✅ | ✅ |
| Register / edit / delete agents | ✅ | ✅ | — |
| Manage SLAs and canaries | ✅ | ✅ | — |
| Review, approve and publish postmortems | ✅ | ✅ | — |
| View ingest keys, manage members | ✅ | ✅ | — |
| Manage the workspace itself | ✅ | — | — |

Roles live in `workspace_members` and are enforced by Row Level Security and database triggers. The UI hides what the database would reject anyway — it is a courtesy, not the control.

---

## Software architecture

### High-level design (HLD)

```text
        ┌──────────────────────────┐
        │   Your AI agents         │
        │   (LangGraph, CrewAI,    │
        │    custom, anything)     │
        └────────────┬─────────────┘
                     │  OpenTelemetry spans
                     │  header: x-fleetwatch-key
                     ▼
   ┌──────────────────────────────────────────┐
   │  Fleetwatch ingest (TanStack server route│
   │  /api/public/*, key-authenticated)       │
   └────────────┬─────────────────────────────┘
                │ writes
                ▼
   ┌──────────────────────────────────────────┐
   │  Postgres (spans, metric_rollups)        │
   │  ├─ SLA engine: rollup vs threshold      │
   │  ├─ Incident state machine               │
   │  └─ Triggers → notifications, RBAC,      │
   │     review gates, last-owner protection  │
   └────────┬───────────────────┬─────────────┘
            │ RLS-scoped reads  │ triggers
            ▼                   ▼
   ┌─────────────────┐   ┌──────────────────┐
   │  React console  │   │  Notifications   │
   │  (TanStack      │   │  (in-app bell;   │
   │   Start + Query)│   │   email/Slack    │
   └────────┬────────┘   │   next)          │
            │            └──────────────────┘
            │ server function
            ▼
   ┌──────────────────────────────────────────┐
   │  AI Gateway — postmortem drafting only    │
   │  (never decides incident state)           │
   └──────────────────────────────────────────┘
```

### Low-level design (LLD) — data model

```text
profiles ─1:1─ auth user
   │
workspaces ─┬─ workspace_members (user_id, role: owner|admin|member)
            ├─ ingest_keys      (token, revoked_at)
            ├─ oncall_schedules (rotation_config, escalation_policy)
            ├─ audit_log        (append-only)
            ├─ notifications    (per-member fan-out, read_at)
            └─ agents ─┬─ sla_configs   (metric, threshold, window_minutes)
                       ├─ spans         (trace_id, duration_ms, status_code)
                       ├─ metric_rollups(window_start, metric, value)
                       ├─ canaries      (schedule_cron, last_result)
                       └─ incidents ────┬─ incident_events (immutable timeline)
                                        └─ postmortem: draft → review → published
```

### Incident lifecycle

```text
 rollup breaches SLA
        │
        ▼
   [ open ] ──acknowledge──▶ [ acknowledged ] ──resolve──▶ [ resolved ]
        │                          │                            │
        └── page responder         └── notes                    ▼
            (escalation policy)                        postmortem drafted (AI)
                                                                │
                                                     submitted for review
                                                                │
                                            ┌───────────────────┴───────────┐
                                            ▼                               ▼
                                      approved ──▶ published        changes requested
```

Publishing is blocked at the database level until `review_status = 'approved'`. There is no client path around it.

### Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | TanStack Start (React 19, Vite 7) | File routing, isomorphic loaders, first-class server functions |
| Data | TanStack Query | Cache, polling, invalidation on auth transitions |
| Backend | Postgres + Auth (Lovable Cloud) | RLS as the real authorization boundary |
| Server logic | `createServerFn` / server routes | Typed RPC internally, raw HTTP for ingest and webhooks |
| AI | Lovable AI Gateway | Postmortem drafting only, with graceful degradation |
| Styling | Tailwind v4 + semantic tokens | Dark-first console, one design language across marketing and app |

### Security posture

- Row Level Security on every table; policies scoped through `SECURITY DEFINER` helpers so nothing recurses.
- Roles in a dedicated table — never on a profile row — so privilege escalation has nowhere to live.
- Service-role credentials never leave the server; the browser only ever holds a publishable key.
- Immutable audit log and incident events: insert and read, no update, no delete.
- Ingest keys are workspace credentials, visible to owners and admins only.

---

## Development

### Run it locally

```sh
git clone <this-repository-url>
cd fleetwatch
npm i
npm run dev
```

### Roadmap

#### ✅ Built

- Postgres schema with multi-tenant RLS, roles, audit log
- Signup provisioning: workspace, owner membership, ingest key, on-call schedule
- Email/password and Google authentication
- Marketing site: landing, pricing, docs, blog
- Fleet dashboard, agent registration with default SLAs, sparklines
- Agent detail: SLAs, spans, canaries, incident history
- Incident timeline with acknowledge, resolve, notes
- AI-drafted postmortems with a full review and approval flow
- Role-based access control enforced in the database and reflected in the UI
- In-app notifications generated by database triggers

#### 🚧 Pending for beta

- Escalation worker: page → wait → escalate on the configured policy
- Email and Slack notification channels
- Ingest hardening: per-key rate limits, rotation and revocation UI
- Member invitations by email
- Published SDK packages for Python and TypeScript

#### 🔭 What's next

- Public status pages built from published postmortems
- Billing, plan limits and usage metering
- Anomaly baselines that suggest SLA thresholds from observed traffic
- Multi-region ingest and long-horizon span retention tiers
- Terraform / config-as-code for agents and SLAs

### Release process

Run [`READY_CHECKLIST.md`](./READY_CHECKLIST.md) before every release. Broader gates live in
[`MVP_LAUNCH_CHECKLIST.md`](./MVP_LAUNCH_CHECKLIST.md), [`LAUNCH_CHECKLIST.md`](./LAUNCH_CHECKLIST.md),
[`PRODUCTION_CHECKLIST.md`](./PRODUCTION_CHECKLIST.md) and [`EXECUTION_CHECKLIST.md`](./EXECUTION_CHECKLIST.md).

---

<div align="center">

**Fleetwatch** — because "the agent seems fine" is not an operational posture.

</div>
