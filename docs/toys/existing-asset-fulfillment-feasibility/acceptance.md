# EXIS1 Acceptance

Define explicit, machine-checkable acceptance criteria and where evidence is stored.

## Machine-Checkable Criteria

- [ ] `npx jest test/toys/2026-08-23/assetSkuFulfillmentFeasibility.test.js --runInBand --watchman=false` exits with status 0.
- [ ] A free asset is feasible and an overlapping committed segment is rejected.
- [ ] `COMMAND_HERE` output includes `EXPECTED_TOKEN`.
- [ ] `COMMAND_HERE` generates artifact at `ARTIFACT_PATH`.

## Evidence Collection

- Command log path: `artifacts/toys/<toy-name>/commands.log`
- Generated artifacts:
  - `artifacts/toys/<toy-name>/...`
- Test report path (if applicable): `artifacts/toys/<toy-name>/test-report.*`

## Pass/Fail Rules

- Pass when focused tests verify pure, asset-only feasibility.
- Fail when any command exits non-zero, expected output token is missing, or artifact path is absent.
