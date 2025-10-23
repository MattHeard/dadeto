# Create Fetch Credit Extraction

**Challenge:** Ensuring the shared `createFetchCredit` helper continued to use the correct snapshot utility once relocated to the core package without introducing circular imports in the cloud entry point.

**Resolution:** Moved the factory into `src/core/cloud/get-api-key-credit-v2/core.js` with a direct import of the snapshot helper and introduced a passthrough module under `src/cloud/get-api-key-credit-v2/` to re-export the core implementation for the function-based entry point.
