# Tetracube construction harness

## Local run instructions

1. Install repository prerequisites with `npm install` if dependencies are missing.
2. Run the model suite with `npm run test:impact -- --files test/core/browser/game/tetracube.test.js`.
3. Check changed-core coverage with `npm run check:impact:run -- --files src/core/browser/game/tetracube/tetracube.js test/core/browser/game/tetracube.test.js`.
4. Run the fast repository gate with `npm run check` before closing a loop.
5. Use `npm run start`, open `/tetracube/`, and follow the keyboard legend rendered on the page.

## Expected observable outputs

- The focused Jest suite reports all tetracube model cases passing.
- The changed-core evaluator reports 100% coverage for the model and passing ESLint, core-parse, and zero-clone checks.
- The fast check and build exit with status 0.
- The `/tetracube/` page visibly shows the current ghost piece, its settled landing preview, placed pieces, and action feedback; failed placement leaves the structure unchanged.
- Exit code for successful commands: `0`.

## Troubleshooting hooks

- For a test failure, rerun the named focused suite and inspect its first failing assertion before running broader checks.
- For coverage failures, inspect the changed-core report emitted by `npm run check:impact:run` and add a test for each uncovered branch.
- For local page issues, inspect `reports/build/` output and the generated `public/tetracube/` files after `npm run build`.
- Log location: terminal output and the evaluator's existing `reports/` artifacts.
- Cleanup: generated `public/` and `reports/` contents follow the repository's existing ignored-artifact policy.
