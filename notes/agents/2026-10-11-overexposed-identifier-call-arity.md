# Overexposed identifier call arity

- Unexpected hurdle: the full `npm run check` takes several minutes because it runs coverage in many serial shards before the remaining gates.
- Diagnosis: `handleIdentifierCall` combined imported identifier resolution and local exported-function usage counting in one context-heavy function.
- Fix: split those two behaviors into `recordImportedIdentifierCall` and `recordOwnExportCall`, retaining import precedence and the original AST visitor context.
- Evidence: focused Jest passed (1 suite, 14 tests); targeted ESLint and `npm run tsdoc:check` passed; fresh no-cache inventory fell from 3 findings in 3 files to 2 in 2 files; `npm run check` passed all 10 gates; `npm run build` passed. Inventory artifact: `.tmp/parameter-bag-global-after-overexposed-identifier.json`. Check log: `.tmp/npm-check-overexposed-identifier-arity.log`. Build log: `.tmp/build-overexposed-identifier-arity.log`.
- Next time: continue with `runStrykerInWorktree` at `src/core/scripts/run-stryker-worktree-core.js:221` (effective arity 6), after recording a bounded contract in `dadeto-g6qi`.
