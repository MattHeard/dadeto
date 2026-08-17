# Acceptance: Possession Request

## Machine-Checkable Criteria
- [x] `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/toys/2026-08-17/possessionRequest.test.js` passes.
- [x] `npm run build` succeeds.
- [x] Generated beta artifact contains `POSS1`.

## Evidence Collection
- Command log path: `artifacts/toys/possession-request/commands.log`
- Generated artifacts: `public/`
- Test report path: focused Jest output.

## Pass/Fail Rules
Pass when valid normalization, deterministic invalid-field errors, build output, and beta registration are verified.
