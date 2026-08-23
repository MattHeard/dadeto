# EXIS2 Harness

Describe how to run the toy locally and what outputs should be observed.

## Local Run Instructions

1. Install prerequisites: `npm install`
2. Use the focused Jest fixture.
3. Run `./node_modules/.bin/jest test/toys/2026-08-23/multiSegmentAssetFulfillment.test.js --runInBand --watchman=false --forceExit`.

## Expected Observable Outputs

- Terminal output should include:
  - `EXPECTED_LINE_1`
  - `EXPECTED_LINE_2`
- Artifacts written to:
  - `ARTIFACT_PATH_1`
  - `ARTIFACT_PATH_2`
- Exit code:
  - `0`

## Troubleshooting Hooks

- Verbose mode command:
- Log location:
- Cleanup command:
