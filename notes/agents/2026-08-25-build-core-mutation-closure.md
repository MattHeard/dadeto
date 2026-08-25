# Mutation closure: buildCore

- Evidence: final authoritative Stryker scan instrumented 16 mutants; 13 killed, 3 ignored, 0 surviving, and 0 timed-out mutants.
- Focused Jest verification passed 4 tests in `test/core/scripts/generate/writeFormattedHtml.test.js`.
- Existing success, formatting failure, null-config/default-parser, and config-resolution failure contracts fully cover the executable mutation set.
- Quality gate: `npm run check` ran; known sandbox `spawnSync node EPERM`, audit, lint, and duplication failures remain; file-specific ESLint passed.
