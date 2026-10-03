# Neon Covenant Harness

## Local Run Instructions

Run `npm run build`, then `npm run start`. Open `/neon-covenant/` or the NEON1 blog toy. Run `node scripts/run-jest.js --runInBand test/core/browser/game/neonCovenant.test.js` for the deterministic harness.

## Expected Observable Outputs

The first-run introduction persists until A advances or B closes. A opens the ledger directly ahead. X exposes the dashboard and all operations; Y assigns B. Ledger → End shift displays an economic report and advances exactly one shift.

## Troubleshooting Hooks

Use `.tmp/neon-tests.log` and the exported version-2 save. Cloud CI owns routine Playwright acceptance. The existing Mosslight browser harness also serves the built lab page for explicit local browser validation.
