# Assign moderation CORS origin factory

- **Challenge:** Needed to relocate the assign moderation job CORS origin helper into the shared core module without breaking the entrypoint's ability to derive allowed origins from environment variables.
- **Resolution:** Introduced a dependency-injected factory in the core package that accepts the existing `getAllowedOrigins` helper and `createCorsOriginHandler`, then updated the Cloud Function entrypoint to consume the shared factory.
