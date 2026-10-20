# THREEFOLD partial passenger rescue — 2026-10-19

## Unexpected hurdle

- The default Jest pool under `/tmp` was read-only in the managed workspace (`EROFS`). The focused retry worked with a worktree-local pool directory.
- The first full fast check found one lint warning: the expanded simulation-test `describe` callback exceeded the 450-line rule. Lint also applied an unrelated formatting fix to `test/core/browser/main.import.test.js`.

## Diagnosis and fix

- The episode model only represented passengers as aboard, evacuated, or lost, so the first mooring interaction evacuated everyone at once.
- Added an additive `partial` passenger state. A first in-range pre-surge interaction rescues one abstract group; a second rescues the other. Surge preserves the partial state while the ferry outcome indicates that the remaining group was lost.
- Kept version 1 save compatibility, added pre- and post-surge roundtrip coverage, exposed explicit group counts through the existing Mosslight renderer, and updated the field guide, harness, acceptance criteria, failure modes, and spec.
- Moved the new simulation regression into its own `describe` block to satisfy the test-file line limit. Restored the unrelated lint autofix before committing.

## Evidence

- Focused suites: 5 suites / 113 tests passed using `DADETO_JEST_POOL_DIR=.tmp/jest-pool-rank5 npm run test:impact -- --files test/core/browser/game/threefold-episode.test.js test/core/browser/game/threefold-simulation.test.js test/core/browser/game/threefold-save.test.js test/core/browser/game/threefold-renderer.test.js test/core/browser/game/threefold-runtime.test.js`.
- `npm run build` generated `public/threefold/` and copied the episode runtime.
- `DADETO_JEST_POOL_DIR=.tmp/jest-pool-rank5 DADETO_CHECK_TIMEOUT_MS=7200000 npm run check` passed all 10 fast local gates, including five impact shards (6,580 tests) and zero clones. This is local fast-check evidence, not full-suite coverage evidence.

## Next-time guidance

- Set a worktree-local Jest pool before running tests in this managed workspace.
- When a test change pushes a large suite callback over a lint limit, move the bounded case to a separate describe group.
- Review `git status` after `npm run check`, because the repository lint command uses `--fix` and can touch unrelated formatting.
