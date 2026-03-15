# Runner-note 2026-03-15
- **Bead**: dadeto-3l4o (Add first browser e2e smoke test)
- **Hurdle**: `npx playwright test --config=playwright.config.js e2e/smoke.spec.js` never emitted output and the parent `codex-linux-sandbox` processes kept the job running indefinitely; I aborted after several minutes of blank CLI.
- **Diagnosis**: `ps -ef` kept showing the same PIDs (codex-linux-sandbox → npm exec → node) which meant the Playwright harness never launched Chromium before hanging.
- **Fix chosen**: stopped the hung run and recorded the hang for the bead so it can be retried in a full Playwright-friendly sandbox; no code changes were made.
- **Next-time guidance**: avoid running the smoke spec until the sandbox can actually start Chromium; if the hang persists, capture the Chromium stderr/Playwright log before retrying so we know if instrumentation is failing or Chrome is blocked.
