## Context
Addressed the cyclomatic complexity and documentation lint failures in `src/core/cloud/get-api-key-credit/handler.js` by extracting focused helpers for method validation, UUID resolution, and credit fetching.

## Outcome
`npx eslint src/core/cloud/get-api-key-credit/handler.js --max-warnings=0` now passes, and the handler retains its original behavior with clearer guard rails for dependency validation.
