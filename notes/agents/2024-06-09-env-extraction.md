# Generate Stats Environment Refactor

- **Challenge:** Ensuring the new helper preserved existing environment usage without affecting downstream consumers.
- **Resolution:** Introduced a dedicated `getProcessEnv` function and reused its result for both the core factory and CORS configuration to maintain consistent environment access.
