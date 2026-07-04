# Acceptance: JSON Parse Error Explainer

## User-visible behavior
- Valid JSON returns a JSON object containing the parsed value.
- Malformed JSON returns a structured error payload instead of throwing.
- The error payload includes:
  - a message string,
  - an approximate failure location,
  - the original input length.

## Evidence
- `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/toys/2026-07-04/jsonParseErrorExplainer.test.js` passes.
- `npm run check` passes.

## Pass/Fail Rules
- Pass when the targeted toy test proves success and failure handling, and the structured error includes the required fields.
- Fail when malformed input throws, location data is absent on detectable parser errors, or input length is not returned.
