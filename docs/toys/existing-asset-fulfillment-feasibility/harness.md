# EXIS1 Harness

Describe how to run the toy locally and what outputs should be observed.

## Local Run Instructions

1. Install prerequisites: `npm install`
2. Use the fixture in the focused Jest suite.
3. Run: `npx jest test/toys/2026-08-23/assetSkuFulfillmentFeasibility.test.js --runInBand --watchman=false`

## Expected Observable Outputs

- Terminal output should report a passing suite.
- Artifacts written to:
  - `ARTIFACT_PATH_1`
  - `ARTIFACT_PATH_2`
- Exit code:
  - `0`

## Troubleshooting Hooks

- Verbose mode command:
- Log location:
- Cleanup command:
