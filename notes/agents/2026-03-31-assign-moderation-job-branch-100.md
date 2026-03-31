# 2026-03-31 assign-moderation-job branch-100 follow-up

- **Unexpected hurdle:** Re-enabling `assign-moderation-job-core.js` surfaced a residual branch from a defensive nullish fallback that could not execute after the surrounding guard.
- **Diagnosis path:** Removed its coverage ignore glob, inspected prior uncovered lines, and ran focused tests around CORS/origin and snapshot-doc selection helpers.
- **Chosen fix:** Removed the unreachable `?? []` fallback in `resolveSnapshotDocs` and added a CORS test that exercises omitted allow-list behavior with missing origin.
- **Next-time guidance:** Prefer deleting dead defensive branches once an explicit type/shape guard guarantees the branch cannot execute.
