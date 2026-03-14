# 2026-03-14 · dadeto-3l4o runner loop

## Unexpected hurdle
- Playwright defaults to `playwright.config.ts` (the Dendrite suite under `test/e2e`), so running `npx playwright test` hits an unrelated set of fixtures and fails when Chromium refuses to start (`sandbox_host_linux` complains about `shutdown(child_socket_, SHUT_RD)` in this sandbox).

## Diagnosis path
- The blog smoke spec lives under `e2e/` and the accompanying JS config needs to be passed explicitly (`--config=playwright.config.js`) plus the test launch still hit the sandbox shutdown failure, so I had to terminate the command after it hung with no output.

## Chosen fix
- Added `e2e/smoke.spec.js` with a tiny `http` server that serves `public` and a smoke test that checks the landing page loads without console errors or uncaught exceptions, pointing it at the local build output.

## Next steps / open questions
- Verify the smoke spec via `npx playwright test --config=playwright.config.js smoke.spec.js` once the Chromium sandbox issue is resolved (the default `npx playwright test` also fails in this env). Also note that the smoke harness assumes the `public` folder already contains the production assets.

## 2026-03-14T11:58 runner loop
- unexpected hurdle: Playwright still cannot start Chromium inside this sandbox; `npx playwright test --config=playwright.config.js e2e/smoke.spec.js` only printed the CLI banner and then hung, so I interrupted after about a minute without ever seeing console output from the browser.
- diagnosis path: Confirmed the run never progressed past the invocation banner or spawned Chromium, matching the prior sandbox_host_linux failure, and realized the runner environment cannot deliver the required browser to exercise the smoke harness.
- chosen fix: Captured the blocked Playwright run in repo memory, then reran `npm test` (476 suites / 2357 tests, hover 93.91% coverage) to prove the rest of the stack stays green while the browser smoke test waits for a healthy host.
- next steps / open questions: Re-run the smoke spec in a Playwright-ready environment so it can detect console errors, and note that `bd comments add` is currently stalling while trying to sync through `.git` (read-only here), so the bead still needs its proof-of-work comment once the CLI can persist it.
