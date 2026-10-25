# Industrial heat-pump readiness harness

## Local Run Instructions

1. Install prerequisites: `npm install` when dependencies are missing.
2. Prepare fixtures/config: none; the synthetic food-processing case is stored
   as a deterministic test fixture.
3. Run harness command:

   ```sh
   node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand test/core/industrialHeatPumpReadiness.test.js
   ```

For changed-core coverage, use:

```sh
npm run check:impact:run -- --files src/core/industrialHeatPumpReadiness.js test/core/industrialHeatPumpReadiness.test.js
```

Run repository acceptance with `npm run check` and `npm run build`.

## Expected Observable Outputs

- Terminal output should include: the focused Jest suite passes and each model
  result matches its hand-worked fixture.
- Artifacts written to: Jest/coverage reports under `.tmp/` or configured
  `reports/` paths; the pure calculator itself writes no files.
- Exit code: `0`.

## Troubleshooting Hooks

- Verbose mode command: add `--verbose` to the Jest command.
- Log location: terminal output; Bead `dadeto-2j89` retains acceptance evidence.
- Cleanup command: remove only the local generated coverage artifact if needed;
  no external state is created.
