# Assign moderation job environment refactor

Identified multiple default parameters referencing `process.env` directly in the assign moderation job entrypoint. Introduced a shared `defaultEnvironment` retrieved via `getEnvironmentVariables()` so the module consumes the abstraction consistently without altering the dependency injection flow.
