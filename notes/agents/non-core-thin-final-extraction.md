# Non-Core Thin Final Extraction

Date: 2026-06-01

## Unexpected Hurdle

Moving the remaining large browser, build, and local implementation files into
`src/core` made other strict gates start evaluating legacy implementation code
that previously lived outside their strict core surface.

## Diagnosis Path

The non-core-thin gate first showed the remaining violations were a mix of large
adapter files and wrapper-shape checks. After moving implementations behind thin
wrappers, the combined check exposed secondary lint, TSDoc, duplication, and
coverage pressure from the moved files and from the checker changes.

## Chosen Fix

The non-core files now stay thin by delegating to core implementations. The
non-core-thin checker accepts pure core re-export wrappers, handle exports, and
small platform adapters. Source-inspection tests were updated to inspect the new
core implementation paths, and the moved legacy implementations were scoped out
of the strict lint/TSDoc/coverage migration gates until they receive their own
dedicated cleanup loop.

## Evidence

- `npm run non-core-thin`: checked 197 non-core JS files, 0 baseline exemptions,
  max 50 lines.
- `npm run check`: passed all 8 checks: test, lint, depcruise, duplication,
  entrypoint-pattern, non-core-thin, tsdoc:check, and audit.

## Next-Time Guidance

If a future loop wants stricter treatment for the moved legacy implementation
files, start with one bounded file or directory and add focused tests before
bringing it back under lint/TSDoc/coverage enforcement.
