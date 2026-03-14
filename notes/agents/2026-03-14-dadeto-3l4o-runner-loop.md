# 2026-03-14 · dadeto-3l4o runner loop

## Unexpected hurdle
- Playwright defaults to `playwright.config.ts` (the Dendrite suite under `test/e2e`), so running `npx playwright test` hits an unrelated set of fixtures and fails when Chromium refuses to start (`sandbox_host_linux` complains about `shutdown(child_socket_, SHUT_RD)` in this sandbox).

## Diagnosis path
- The blog smoke spec lives under `e2e/` and the accompanying JS config needs to be passed explicitly (`--config=playwright.config.js`) plus the test launch still hit the sandbox shutdown failure, so I had to terminate the command after it hung with no output.

## Chosen fix
- Added `e2e/smoke.spec.js` with a tiny `http` server that serves `public` and a smoke test that checks the landing page loads without console errors or uncaught exceptions, pointing it at the local build output.

## Next steps / open questions
- Verify the smoke spec via `npx playwright test --config=playwright.config.js smoke.spec.js` once the Chromium sandbox issue is resolved (the default `npx playwright test` also fails in this env). Also note that the smoke harness assumes the `public` folder already contains the production assets.
