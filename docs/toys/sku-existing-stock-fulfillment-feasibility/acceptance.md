# SKUE2 Acceptance

Define explicit, machine-checkable acceptance criteria and where evidence is stored.

## Machine-Checkable Criteria

- [ ] `./node_modules/.bin/jest test/toys/2026-08-23/multiSegmentAssetFulfillment.test.js --runInBand --watchman=false --forceExit` passes.
- [ ] Matching assets are ordered lexically and short-circuit on success.
- [ ] `COMMAND_HERE` output includes `EXPECTED_TOKEN`.
- [ ] `COMMAND_HERE` generates artifact at `ARTIFACT_PATH`.

## Evidence Collection

- Command log path: `artifacts/toys/<toy-name>/commands.log`
- Generated artifacts:
  - `artifacts/toys/<toy-name>/...`
- Test report path (if applicable): `artifacts/toys/<toy-name>/test-report.*`

## Pass/Fail Rules

- Pass when all checklist items above are verified by command output and artifact existence.
- Fail when any command exits non-zero, expected output token is missing, or artifact path is absent.
