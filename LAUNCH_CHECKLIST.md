# LAUNCH_CHECKLIST

Everything that must be true before Fleetwatch is announced publicly.

## Product
- [x] Marketing site: landing, pricing, docs, blog
- [x] Email + password auth with confirmation email
- [x] Google sign-in
- [x] Workspace auto-provisioned on signup (workspace, owner membership, ingest key, on-call schedule)
- [x] Fleet dashboard with agent registration and default SLAs
- [x] Agent detail: SLAs, spans, canaries, incident history
- [x] Incident timeline: acknowledge, resolve, notes
- [x] AI-drafted postmortems with human review and approval
- [x] In-app incident notifications
- [x] Role-based access control (owner / admin / member)
- [ ] Email/Slack delivery for pages (in-app only today)
- [ ] Billing and plan enforcement

## Trust
- [x] Row Level Security on every workspace-scoped table
- [x] Postmortems cannot be published without approval
- [x] A workspace can never lose its last owner
- [x] Ingest keys visible to owners/admins only
- [ ] Ingest key rotation UI
- [ ] Public status page for published postmortems

## Go-to-market
- [ ] Landing page copy reviewed by a design partner
- [ ] Docs verified against a real OTel exporter end to end
- [ ] Pricing page matches billing configuration
- [ ] Support inbox monitored
- [ ] Analytics + error reporting dashboards watched daily for week one
