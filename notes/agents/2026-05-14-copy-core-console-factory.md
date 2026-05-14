# Copy Core Console Factory Input

- Bead: dadeto-rufy
- Change: `createCopyCore` now accepts a console-like dependency instead of a prebuilt `messageLogger`.
- Core behavior: `runCopyWorkflow` derives its logger via `createConsoleMessageLogger` internally.
- Adapter impact: `src/build/copy.js` passes `console` directly to `createCopyCore`.
- Evidence: focused copy test passed; full `npm run check` passed after network escalation for `npm audit`.
- Audit: 0 vulnerabilities.
