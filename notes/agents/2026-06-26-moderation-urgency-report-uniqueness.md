Unexpected hurdle: the existing report intake path only persisted `{ variant, createdAt }`, so there was no place to enforce one-report-per-reporter without widening the request contract.

Diagnosis path: traced `src/cloud/report-for-moderation/index.js` to the bare `moderationReports.add(...)` wiring, then followed the core handler and the public report button payload to confirm reporter identity was not yet part of the flow.

Chosen fix: added an optional duplicate-check dependency to the report core, required a normalized reporter identity in the core request path, and introduced a shared urgency calculator that uses only the approved page-level signals.

Next-time guidance: if the browser UI needs to match this policy, thread a logged-in user id or anonymous reporter token through the report click path so the once-per-page rule is enforced end to end.
