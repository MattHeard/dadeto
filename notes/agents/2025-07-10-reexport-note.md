# Re-export createDb

- **Challenge:** Needed to expose the `createDb` factory through the existing `core.js` module without disrupting exports or tests.
- **Resolution:** Added a named re-export in `core.js` and reran the full Jest suite to confirm no regressions.
