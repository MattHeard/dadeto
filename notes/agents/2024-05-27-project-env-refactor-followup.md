## Context
Follow-up on the generate stats project resolver refactor.

## Challenges
- Needed to share the `getProjectFromEnv` helper with both the Firebase function entrypoint and the reusable core without duplicating environment handling logic.
- Updating the tests required touching multiple helper call sites that previously injected a precomputed project id.

## Outcome
- Moved the environment-derived project lookup into the shared core module and switched the public entrypoint and tests to pass `process.env` (or mocked env objects) into the factory.
- Added targeted unit coverage for the new helper to keep confidence high around the environment resolution rules.
