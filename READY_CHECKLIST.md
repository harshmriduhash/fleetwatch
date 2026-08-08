# READY_CHECKLIST

A quick pre-flight before each release. Run top to bottom; everything should be green in under ten minutes.

## Build
- [x] `bunx tsgo --noEmit` clean
- [x] No unresolved imports; every route file exists before it is linked
- [x] No secrets in client bundles

## Smoke test (manual, ~5 min)
- [x] `/` renders with no console errors
- [x] `/pricing`, `/docs`, `/blog` render
- [x] `/app/fleet` redirects to `/auth` when signed out
- [ ] Sign up with a fresh email → confirmation prompt appears
- [ ] Sign in → land on the fleet dashboard
- [ ] Register an agent → default SLAs appear on the agent detail page
- [ ] Open an incident → acknowledge → note → resolve; the timeline records each step
- [ ] Draft a postmortem → submit → approve → publish
- [ ] Notification bell shows the incident events and clears when marked read
- [ ] Demote yourself to member (second account) → privileged controls disappear
- [ ] Sign out → back button does not restore the console

## Data
- [ ] Security linter clean
- [ ] No table in `public` without RLS and GRANTs
- [ ] Migrations applied in order with no manual drift

## Comms
- [ ] Release note written
- [ ] Known limitations updated in `MVP_LAUNCH_CHECKLIST.md`
