# Agricultural Rover Model Harness

## Local Run Instructions
1. Install repository dependencies with `npm install` if `node_modules` is missing.
2. The tests build their own deterministic one-hectare input; no secrets or fixtures are needed.
3. Run `npx jest --runInBand --runTestsByPath test/core/browser/game/agriculturalRover.test.js test/core/browser/game/agricultural-rover-page.test.js`.
4. Run the focused changed-file evaluator with `npm run check:impact:run -- --files src/core/browser/game/agricultural-rover/agricultural-rover.js test/core/browser/game/agriculturalRover.test.js test/core/browser/game/agricultural-rover-page.test.js`.
5. Run `npm run build` and open `/agricultural-rover/` in the generated site. Change coverage or downtime, update the comparison, download a brief, then import it and confirm the estimates match.

## Expected Observable Outputs
- Terminal output should include:
  - `Test Suites: 2 passed`
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

## Scoped mutation check

From the repository root, run:

```sh
npx stryker run docs/toys/agricultural-rover/stryker.config.mjs
```

The configuration extends the shared Stryker defaults and mutates the entire rover model. It uses one worker, reuses a runner at most ten times, and skips copying only generated `public/` and `.tmp/` output into the sandbox. Source and test files remain included. The shared static-mutant handling is unchanged. The separate JSON report at `reports/mutation/agricultural-rover.json` preserves mutation reports for other toys.

Inspect every survivor and distinguish a behavioral gap from an equivalent mutation. Keep timed-out nonterminating mutations separate from killed mutations. A successful Stryker process exit alone does not prove that no mutants survived.

## Catalogue regression

```sh
node scripts/run-jest.js --runInBand --runTestsByPath test/generator/decisionToolCatalogueLinks.test.js test/core/browser/game/agricultural-rover-page.test.js
```

The generator test uses the actual `src/build/blog.json` entries and generator output, checks readable clickable standalone links for both decision tools, and verifies the referenced pages exist. The presenter fixture checks accessible adjacent-tool navigation. After `npm run build`, inspect the matching anchors in `public/index.html` and `public/agricultural-rover/index.html`; a bare URL in prose is not a clickable catalogue link.
