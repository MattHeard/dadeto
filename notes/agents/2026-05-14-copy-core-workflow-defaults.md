# Copy Core Workflow Defaults

- Bead: dadeto-pa0u
- Change: `createCopyCore` now captures copy workflow IO and logging adapters.
- Adapter impact: `src/build/copy.js` calls `runCopyWorkflow()` with no arguments.
- Core impact: `runCopyWorkflow` uses the dependencies injected into the copy core factory.
- Evidence: `npm test` passed with 504 suites, 2560 tests, and 100% statement, branch, function, and line coverage.
- Evidence: `npm run check` passed after network escalation for `npm audit`; audit found 0 vulnerabilities.
