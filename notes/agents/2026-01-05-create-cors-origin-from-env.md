# Extract createCorsOriginFromEnvironment factory
- **Challenge:** Needed to thread the `createCreateCorsOrigin` and `createCorsOriginHandler` dependencies into the helper without duplicating existing logic.
- **Resolution:** Introduced a small factory that accepts both functions, returning the configured environment-aware resolver while preserving the prior call site.
