# 2026-03-08: Symphony server lifecycle after launch

- Bead: `dadeto-0dar`
- Scope: clarify the single-run lifecycle after Symphony launches one detached Ralph child, without widening into supervision or restart management.
- Unexpected hurdle:
  - the launch path already persisted enough metadata to recover a run, but the operator-facing recommendation still read like the HTTP server was the primary control surface after launch
- Diagnosis path:
  - inspected `src/local/symphony/{server,app,launch,statusStore}.js`, then compared the launch behavior with the existing project note and focused launch tests
- Chosen fix:
  - persisted explicit `operatorArtifacts` paths in bootstrap status
  - updated the launched-run recommendation so it says the Ralph child is detached and may outlive the Symphony server
  - pointed recovery at `tracking/symphony/status.json` plus the per-run stdout/stderr logs
  - updated the Symphony project note so another agent can recover the same lifecycle contract from repo memory instead of reading code
- Next-time guidance:
  - if operators still need more confidence after this slice, the next bounded step is exit/outcome reconciliation for detached children, not broader server supervision
