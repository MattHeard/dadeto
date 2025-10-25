# Shared fetch helper move

- **Challenge:** Needed to expose the Cloud Function-bound `fetch` helper to
  multiple functions without duplicating the binding implementation.
- **Resolution:** Moved the helper into `src/cloud/gcf.js`, re-exported it from
  `generate-stats`, and updated the copy script so the shared helper is written
  to the deployed function directory.
