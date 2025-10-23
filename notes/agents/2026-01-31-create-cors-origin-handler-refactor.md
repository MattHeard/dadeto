# Reuse local CORS origin handler helper

- **Challenge:** Needed to remove the `createCorsOriginHandler` dependency injection without losing the verification points the existing unit suite provided.
- **Resolution:** Leaned on module-level spies initially, but fell back to integration-style assertions for the affected tests once Jest rejected spying on ESM exports.
