# Failure Modes: Change Together Explorer

## Initial Predicted Failure Classes
- Setup/configuration mismatch:
  - The toy file is not registered in `src/build/blog.json`, so it never appears in the public index.
  - The blog key is generated manually instead of using the key generator.
- Invalid or missing inputs:
  - `changeSets` is not an array.
  - A change-set record lacks `files`.
  - `files` contains non-string entries or duplicates.
- Dependency/service unavailable:
  - None expected for the first version.
- Non-deterministic timing or ordering:
  - Equal-count pairs or files sort inconsistently.
- Environment-specific behavior:
  - Build artifacts regenerate correctly locally but not in the shipped `public/` tree.

## Detection Signals
- Error signatures/log lines:
  - Jest failure in `test/toys/2026-06-15/changeTogetherExplorer.test.js`.
  - Missing `CHAN1` in `public/blog.json`.
- Observable symptoms:
  - Co-change pair counts are wrong or unstable.
  - Public index does not show the new toy in date order.
- Failing command(s):
  - `npm test`
  - `npm run check`
  - `npm run build`

## First-Response Playbook
1. Capture the failing command and full output.
2. Check whether the failure is parse, scoring, ordering, or manifest registration.
3. Add or adjust a focused Jest case before changing the explorer logic.
4. Rebuild the public assets and re-run the repo gates.

## Promoted from Real Failures
- Date:
- Failure observed:
- Root cause:
- Fix implemented:
- Guardrail added (test/doc/harness):
