# CORS environment injection refactor

## Challenges
- Needed to make sure the new `getAllowedOrigins` signature did not break the numerous CORS config wrappers that previously called it without arguments.

## Resolutions
- Updated each wrapper to forward `process.env` explicitly and adjusted the shared helper to read from the provided object, keeping behaviour intact.
- Refreshed the unit test expectations to exercise the new signature while continuing to stub `process.env` for each scenario.
