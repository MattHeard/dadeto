# 2026-05-14 Copy Clean Policy Core

## Context
- Bead: `dadeto-cs4g`
- Goal: move the `public/` cleanup policy from `src/build/copy.js` into the core build copy workflow.

## Chosen Fix
- Moved the decision to remove `dirs.publicDir` into `runCopyWorkflow` in `src/core/build/blog.js`.
- Kept the Node-specific filesystem deletion in `src/build/fs.js` as an injected `removeDirectory` adapter.
- Removed the direct `rmSync` import and call from `src/build/copy.js`.
- Extended `test/core/copy.test.js` to prove cleanup happens before recreating `publicDir`.

## Evidence
- `npm test` passed with 504 suites, 2558 tests, and 100% statements/branches/functions/lines.
- `npm run check` passed with Jest, lint, dependency-cruiser, duplication, non-core thinness, and `npm audit` reporting 0 vulnerabilities.

## Next-Time Guidance
For build scripts, keep CLI files limited to resolving project paths and injecting Node adapters. Workflow decisions such as cleanup ordering belong in `src/core/build`, with side effects exposed through injected IO capabilities.
