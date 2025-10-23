# Assign moderation cors proxy

- **Challenge:** Needed to expose the existing CORS configuration within the assign moderation job package without changing other imports.
- **Resolution:** Added a local re-export module that forwards both default and named exports from the shared `src/cloud/cors-config.js`, then updated the job entry point to consume the new module.
