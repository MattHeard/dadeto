# 2026-05-14 Copy Directory Map Core

## Context
- Bead: `dadeto-bqc8`
- Goal: move the static-site copy directory map composition from `src/build/copy.js` into `src/core/build`.

## Chosen Fix
- Added `createCopyDirectories` and `createStaticSiteCopyDirectories` to `src/core/build/blog.js`.
- Removed directory-map composition from `src/build/copy.js`; it now resolves base paths, creates adapters, asks core for the directory map, and runs the workflow.
- Removed the now-unused `createCopyDirectories` helper from `src/build/path.js`.
- Removed the `src/build/copy.js` non-core thinness exemption because the adapter is now 44 lines.

## Evidence
- Focused `test/core/copy.test.js` passed; the nonzero exit was only the expected global coverage threshold on a targeted run.
- `npm test` passed with 504 suites, 2560 tests, and 100% statements/branches/functions/lines.
- `npm run check` passed with Jest, lint, dependency-cruiser, duplication, non-core thinness, and `npm audit` reporting 0 vulnerabilities.
- `npm run non-core-thin` now reports 52 baseline exemptions, down from 53.

## Next-Time Guidance
When a non-core file drops below the thin-file threshold after moving policy into core, remove its exemption in the same change so the baseline shrinks monotonically.
