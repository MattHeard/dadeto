# Neon Covenant Harness

## Local Run Instructions

Run `npm run build`, then `npm run start`. Open `/neon-covenant/` or the NEON1 blog toy. Run `node scripts/run-jest.js --runInBand test/core/browser/game/neonCovenant.test.js` for the deterministic harness.

## Expected Observable Outputs

The first-run introduction persists until A advances or B closes. A opens the ledger directly ahead. X exposes the dashboard and all operations; Y assigns B. Ledger → End shift displays an economic report and advances exactly one shift.

Fresh games start with four cooling units. The optional First-shift guide is the final lab-menu row (X, Up, A from the first row); it uses the real clinic and cooling orders. Test both repair and decline, compare their actual settlement against the forecast, and assert no release or evaluation is granted. A repaired Atlas route reaches its target in six research shifts; do not keep that six-shift expectation while silently removing the repair purchase.

Focused coverage: `node scripts/run-jest.js --runInBand --coverage --collectCoverageFrom='src/core/browser/game/neon-covenant/**/*.js' --coverageDirectory=.tmp/neon-orientation-coverage test/core/browser/game`. Explicitly requested local browser acceptance: `npx playwright test --config test/mosslight.playwright.config.ts test/mosslight-e2e/neon-covenant.spec.ts --workers=1`, after `npm run build`. Keep the browser workload isolated from coverage on this host. Browser tests use actual keypad buttons and check both embedded and standalone phone/desktop routes; first-shift screenshots are `.tmp/neon-first-shift-*.png`.

## Troubleshooting Hooks

Use `.tmp/neon-tests.log` and the exported version-2 save. Cloud CI owns routine Playwright acceptance. The existing Mosslight browser harness also serves the built lab page for explicit local browser validation.
