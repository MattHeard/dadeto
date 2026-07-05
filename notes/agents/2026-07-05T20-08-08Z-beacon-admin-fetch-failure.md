Unexpected hurdle: the repo verification commands are broken in this checkout because required local tooling is missing (`jest`, `@eslint/js`, `espree`, `tsc`, `jscpd`).
Diagnosis: the admin trigger-render catch path was swallowing fetch/CORS failures into UI text only, so the browser error beacon never saw them.
Chosen fix: thread an explicit `reportError` callback through admin trigger-render execution, wire the browser admin entrypoint to `/prod-errors`, and report the caught fetch error before showing the user-facing message.
Next-time guidance: if this regresses, verify the admin entrypoint still passes the beacon reporter into `initAdminApp` and confirm the catch path still reports before display.
