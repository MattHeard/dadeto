# Agricultural Rover Model Harness

## Local Run Instructions
1. Install repository dependencies with `npm install` if `node_modules` is missing.
2. The tests build their own deterministic one-hectare input; no secrets or fixtures are needed.
3. Run `npx jest --runInBand --runTestsByPath test/core/browser/game/agriculturalRover.test.js test/core/browser/game/agricultural-rover-page.test.js`.
4. Run the focused changed-file evaluator with `npm run check:impact:run -- --files src/core/browser/game/agricultural-rover/agricultural-rover.js test/core/browser/game/agriculturalRover.test.js test/core/browser/game/agricultural-rover-page.test.js`.
5. Run `npm run build` and open `/agricultural-rover/` in the generated site. Change coverage or downtime, update the comparison, download a brief, then import it and confirm the estimates match.

## Expected Observable Outputs
- Terminal output should include:
  - `Test Suites: 1 passed`
  - `Impact checks: duplication passed` and `Impact tests: shard 1/1 passed`
  - `Validated 83 toy manuals.` (the count may increase as the catalogue grows)
- Artifacts written to:
  - Jest's normal terminal report; focused coverage is temporary and reports uncovered model branches in evaluator output.
- Exit code:
  - `0`

## Troubleshooting Hooks
- Verbose mode command: `npx jest --runInBand --verbose --runTestsByPath test/core/browser/game/agriculturalRover.test.js`
- Log location: capture command output under the active Bead when Beads is available.
- Cleanup command: no generated persistent fixture or artifact needs cleanup; downloaded briefs are user-owned files.
