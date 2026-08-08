# PRODUCTION_CHECKLIST

Operational readiness for running Fleetwatch as a live service.

## Database & security
- [x] RLS enabled on every table in `public`
- [x] Explicit `GRANT`s for `authenticated` / `service_role` on every table
- [x] Role checks routed through `SECURITY DEFINER` helpers (`is_member`, `has_workspace_role`, `my_role`) — no recursive policies
- [x] Roles stored in `workspace_members`, never on `profiles`
- [x] Server-side triggers enforce postmortem review and last-owner protection (client cannot bypass)
- [x] `handle_new_user` is fault tolerant — a bootstrap failure never blocks signup
- [ ] Point-in-time recovery / backup restore drill
- [ ] Span + rollup retention policy per plan tier

## Application
- [x] Typecheck clean
- [x] Protected routes redirect unauthenticated users
- [x] Sign-out cancels in-flight queries and clears cached workspace data
- [x] All secrets read server-side only (`LOVABLE_API_KEY` never reaches the browser)
- [x] AI drafting degrades gracefully on 402 / 429 / outage
- [ ] Load test span ingest at target write throughput
- [ ] Alert on ingest error rate and queue lag

## Observability of Fleetwatch itself
- [x] Client error reporting wired
- [ ] Uptime monitoring on the marketing site and console
- [ ] On-call rotation for the Fleetwatch team

## Compliance
- [ ] Privacy policy and terms published
- [ ] Data processing agreement template
- [ ] Payload capture is opt-in per workspace (`workspaces.full_payload_capture`) — document retention
