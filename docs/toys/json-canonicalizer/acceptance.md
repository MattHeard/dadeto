# Acceptance: JSON Canonicalizer

## User-visible behavior
- The toy returns pretty-printed JSON with object keys sorted lexicographically at every level.
- Arrays retain their original order.
- Scalars round-trip without structural change.
- Invalid JSON returns a structured error payload instead of throwing.

## Evidence
- `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/toys/2026-07-04/jsonCanonicalizer.test.js` passes.
- `npm run check` passes.

## Pass/Fail Rules
- Pass when the targeted toy test proves deterministic key ordering, nested canonicalization, array preservation, and parse-error handling.
- Fail when key ordering changes across runs, pretty-printing is not stable, or malformed input throws instead of returning a structured error.
