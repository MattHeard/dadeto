# 2026-04-24 copy-cloud EISDIR fix

- **Unexpected hurdle:** `npm run build:cloud` failed with `EISDIR` because a directory copy plan was routed through `individualFileCopies` (which uses `fs.copyFile`).
- **Diagnosis path:** Confirmed `preservedCloudTreeCopies` entries were directory-shaped (`source: .../assign-moderation-job`) and were spread into `individualFileCopies` in `src/build/copy-cloud.js`.
- **Chosen fix:** Removed `preservedCloudTreeCopies` from `individualFileCopies` and appended it to `directoryCopies` in the `runCopyToInfra` call.
- **Next-time guidance:** Keep directory plans and file plans separated at call boundaries; if adding a new plan array, validate `source` type (`file` vs `directory`) before merging.
