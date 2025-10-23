## Refactor for createCorsOrigin extraction

- **Challenge:** Adjusting the CORS setup required keeping the existing factory usage intact while introducing a helper to satisfy the refactor request without altering behavior.
- **Resolution:** Wrapped the original factory invocation in a new `createCreateCorsOrigin` helper that accepts `getAllowedOrigins` and returns the configured `createCorsOrigin` function, ensuring the rest of the module continues to call it as before.
