# Render variant reverse-link effects

- Unexpected hurdle: the first full check found a seven-line clone in the cloud render entrypoint; the unprivileged rerun also hit `EPERM` when spawning Node child processes.
- Diagnosis path: inspected the jscpd report and the child-process stack traces. The entrypoint repeated injected effect dependencies in object literals, while the `EPERM` was a sandbox process restriction rather than a code failure.
- Chosen fix: consolidated the repeated effect dependencies into one shared object, then reran `npm run check` with process permission. Added a permission-first Firestore set adapter and a fresh effect capability for every reverse-link record.
- Next-time guidance: keep the render-entrypoint effect dependency bundle shared, and use fresh capabilities for each concurrently persisted reverse-link record.
- Evidence: focused tests passed (6 suites, 134 tests); `npm run build:cloud` passed; `npm run check` passed all 10 gates, including 11 local Playwright tests and 0 duplication clones.
