# Duplication cleanup note (parallel runner)

- **Unexpected:** After the previous extractor work, `jscpd` still flagged the `Promise.all(... map(...))` patterns in `src/core/cloud/copy.js` and `src/core/cloud/generate-stats/generate-stats-core.js` as clones, even though the payload objects differed.
- **Action:** Introduced the shared `runInParallel` helper located at `src/core/cloud/parallel-utils.js` and rewired both modules to consume it, so the concurrency plumbing now lives in one place and neither file contains the repeated `await Promise.all` block.
- **Learning:** Targeting the shared runtime pattern (parallel iteration) lets the duplication detector see only one implementation, and the remaining per-module callbacks stay small enough that the detector no longer reports them.
