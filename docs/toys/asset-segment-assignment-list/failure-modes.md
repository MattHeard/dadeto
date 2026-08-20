# Failure Modes

- Invalid JSON returns `{ "appended": false }`.
- A non-object or missing assignment returns `{ "appended": false }`.
- Blank or missing `assetId`/`segmentId` returns `{ "appended": false }`.
- A non-list target path is rejected by MEMO4.
- Missing storage helpers are reported by MEMO4; no partial append is reported as successful.
