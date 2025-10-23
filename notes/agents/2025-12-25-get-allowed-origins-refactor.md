# getAllowedOrigins refactor

## Challenges
- Needed to touch every Cloud Function CORS wrapper so they instantiate their own config instead of re-exporting the shared default. Ensured the new pattern still returns a default export consumed by the function entrypoints.

## Resolutions
- Replaced the default import in each wrapper with a named import of `getAllowedOrigins` and rebuilt the config locally.
- Ran the focused Jest suite (`npm test -- cors-config`) to confirm the shared helper still behaves as expected.
