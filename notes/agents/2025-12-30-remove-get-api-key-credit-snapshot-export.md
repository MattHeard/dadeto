## Summary
- Verified that `getApiKeyCreditSnapshot` is only referenced via core modules and not imported from the cloud index entrypoint using `rg`.
- Removed the redundant re-export from `src/cloud/get-api-key-credit-v2/index.js`.
- No blockers encountered beyond confirming the absence of imports.
