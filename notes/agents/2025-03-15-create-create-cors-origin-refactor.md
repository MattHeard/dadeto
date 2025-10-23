# Extract createCreateCorsOrigin helper

- **Challenge:** Needed to move the inline `createCreateCorsOrigin` helper from the Cloud Function entrypoint into the shared core module without breaking the existing configuration pipeline or the Jest coverage expectations.
- **Resolution:** Added a dependency-injected `createCreateCorsOrigin` export to the core package that reuses the existing factory, updated the entrypoint to consume it, and expanded the unit tests to cover the new helper wiring.
