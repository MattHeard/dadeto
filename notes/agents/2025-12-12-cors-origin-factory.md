# CORS Origin Factory Refactor

- Extracted a factory function that receives the allowed origins list and returns the configured CORS origin handler.
- Ensured the handler continues to reuse the existing `isAllowedOrigin` predicate for clarity and reuse.
