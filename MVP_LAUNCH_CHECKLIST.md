# MVP_LAUNCH_CHECKLIST

The minimum bar for letting early/beta users into Fleetwatch. Every item below is verified.

## Can a stranger become a user?
- [x] Signup works (previously broke on workspace bootstrap — fixed)
- [x] Confirmation email is sent and the UI tells the user to check their inbox
- [x] Google sign-in works from the console and the preview
- [x] First login lands on a usable, non-empty console with an onboarding path
- [x] Signing out fully clears session and cached workspace data

## Can they do the core job?
- [x] Register an agent and receive sane default SLAs
- [x] Copy an ingest key and follow docs to send OTel spans
- [x] See fleet health at a glance (healthy / degraded / incident)
- [x] Open an incident timeline, acknowledge it, add notes, resolve it
- [x] Get notified in-app when an incident opens, is acknowledged, or resolves
- [x] Draft a postmortem with AI, submit it for review, get it approved, publish it

## Is it safe for multiple people?
- [x] Owner / admin / member roles enforced in the database, not just the UI
- [x] Members cannot create agents, edit SLAs, view ingest keys, or approve postmortems
- [x] Postmortems require approval before publishing
- [x] The last owner cannot be demoted or removed
- [x] Workspace data is isolated by RLS

## Does it fail gracefully?
- [x] AI drafting reports rate limits, exhausted credits, and outages in plain language
- [x] Missing incidents and unknown routes render a branded fallback
- [x] Loading and empty states everywhere data can be absent

## Known beta limitations (communicate these)
- Notifications are in-app only; email and Slack delivery is next
- Escalation timing is configured but not yet executed by a background worker
- No billing yet — all workspaces run on the free tier
- Member invitations are manual
