# Guarded Symphony status identifier

`getStatusCurrentBeadId` retains its object/string/nonempty checks and delegates
successful lazy projection to canonical `whenOrNull`. Do not eagerly cache the
identifier: existing accessor behavior reads it three times during eligibility
and projection, then once when copying the running status.

Evidence: `.tmp/status-id-tests.log` passes 33 tests, exact 100% bootstrap coverage;
`.tmp/status-id-static.log` fails only duplication, reduced from 71 to 70.
Browser packaging passes in `.tmp/status-id-build.log`. No thresholds or ignore
directives changed. Remaining clone work stays in dadeto-aaou.
