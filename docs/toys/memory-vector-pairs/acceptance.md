# Acceptance: Memory Vector

## User-visible behavior
- The toy appears in the Dadeto blog metadata as `MEMO2`.
- Plain path input is treated as a temporary-memory lookup.
- JSON input can select `temporary`, `permanent`, or `envelope` memory locations.
- Scalar lookups are wrapped in a one-item `vector`.
- Array lookups preserve their array shape in the `vector` field.
- Object lookups are converted into vectors of `{ key, value }` pairs.
- Missing keys or unsupported locations return a structured JSON error with `found:false`.

## Evidence
- `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/toys/2026-05-28/memoryVectorPairs.test.js` passes.
- `npm test` passes.
- `npm run build` includes the new toy entry in generated public blog data.

## Pass/Fail Rules
- Pass when the targeted toy test passes and the generated blog metadata includes `MEMO2`.
- Fail when the toy throws instead of returning structured JSON or when the blog metadata omits the new toy.
