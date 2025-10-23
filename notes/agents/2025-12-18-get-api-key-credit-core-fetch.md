# Move API key credit fetch helper into core

- **Challenge:** The fetch helper lived in the cloud entrypoint, unlike other functions that centralize shared logic in `src/core`.
- **Resolution:** Moved `fetchApiKeyCreditDocument` into the core package with a cloud re-export so the handler mirrors other refactored cloud functions.
