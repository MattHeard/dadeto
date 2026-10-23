# Atlas Context Snapshot Harness

## Local Run Instructions
1. Install prerequisites: `npm install`.
2. Use the deterministic fixtures in `test/core/interpretability/graph.test.js` and `test/core/interpretability/researchServiceV1.test.js`; no credentials or Zod package are needed for the context snapshot cases.
3. Run the focused harness:
   `node --experimental-vm-modules ./node_modules/jest/bin/jest.js --runInBand --runTestsByPath test/core/interpretability/graph.test.js test/core/interpretability/researchServiceV1.test.js --no-watchman`.
4. Run all interpretability tests with coverage for changed core files using the exact command recorded in the Bead.

## Expected Observable Outputs
- Terminal output should include: `21 passed` and `165 passed` for the full interpretability suite.
- Coverage output: 100% statements, branches, functions, and lines for `src/core/interpretability/index.js` and `src/core/interpretability/researchService.js`.
- Artifacts written to: `reports/coverage/coverage-summary.json`.
- Exit code: `0`.

## Troubleshooting Hooks
- Verbose mode command: add `--verbose` to the focused Jest command.
- Log location: capture output under `.tmp/atlas-context-snapshots-check.log` when an explicit log is needed.
- Cleanup command: remove only task-specific `.tmp/atlas-context-snapshots-*` files after preserving needed evidence.
