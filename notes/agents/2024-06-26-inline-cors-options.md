# Inline createCorsOriginFromEnvironment into createCorsOptions

- **Challenge:** Needed to mirror the environment-driven origin wiring without relying on the exported helper so the entry point stayed in sync with the shared core behavior.
- **Resolution:** Recreated the helper's logic locally by invoking the environment getters directly and piping the result into `createCorsOriginHandler`, ensuring the resulting middleware configuration remained identical.
