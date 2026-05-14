# Copy Core FS Adapter Factory Input

- Bead: dadeto-ap79
- Change: `createCopyCore` now accepts `createFsAdapters` instead of a constructed IO adapter.
- Core behavior: `runCopyWorkflow` constructs the filesystem adapters internally before executing the copy workflow.
- Adapter impact: `src/build/copy.js` injects `createFsAdapters` and no longer creates `thirdParty`.
- Evidence: focused copy test passed; full `npm run check` passed after network escalation for `npm audit`.
- Audit: 0 vulnerabilities.
