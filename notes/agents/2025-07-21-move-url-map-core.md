# Generate stats URL map refactor

## Challenges
- Ensuring the core factory derived the URL map when the environment object was missing or not an object without regressing existing behavior.
- Updating the Jest helpers to accommodate the optional `urlMap` dependency while keeping existing tests deterministic.

## Resolutions
- Added a `getUrlMapFromEnv` helper in the core module that falls back to the production map when the env input is invalid.
- Refactored the test `createCore` helper to build dependency objects dynamically and added coverage for both default and overridden URL map scenarios.
