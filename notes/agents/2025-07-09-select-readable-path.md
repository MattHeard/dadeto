# Refactor note

- **Challenge:** Duplicated `formatPathForLog` logic existed in both `src/core/copy.js` and `src/core/cloud/copy.js`, making it unclear whether behavior matched and complicating reuse.
- **Resolution:** Exported the shared `selectReadablePath` helper from `src/core/copy.js` and reused it inside the Cloud copy helpers to guarantee consistent path formatting.
