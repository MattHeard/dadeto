# Assign moderation job CORS origin extraction

- **Challenge:** Needed to restructure the assign moderation entrypoint so the CORS origin handler could be composed from the GCF environment getter without duplicating logic already tested elsewhere.
- **Resolution:** Wrapped the existing `getAllowedOrigins` + `createCorsOriginHandler` pipeline in a helper that accepts the environment getter and returns the origin callback, keeping the module level configuration identical for Express.
