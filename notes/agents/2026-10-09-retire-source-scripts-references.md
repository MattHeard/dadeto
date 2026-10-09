# Retire obsolete source scripts references

- **Unexpected hurdle:** Historical agent notes and current tooling still pointed contributors to an empty source-level scripts directory, despite the scanner relocation.
- **Diagnosis:** A repository-wide search found stale paths in the repo map, quality-gate docs, dependency-cruiser policy, JSDoc include list, and old agent notes; the directory itself was empty.
- **Fix:** Removed the empty directory and obsolete config rules/includes, corrected the repo map and past operational pointers, and documented that local command entrypoints live in `src/local` while shared local logic lives in `src/core/local`.
- **Evidence:** A repository search across source, docs, config, and notes finds no remaining references. `npm run depcruise`, `npm run non-core-thin`, and `npm run tsdoc:check` passed; full `JEST_CACHE_DIRECTORY=/home/matt/dadeto/.jest-cache TMPDIR=/home/matt/dadeto/.tmp DADETO_COVERAGE_SHARD_SIZE=40 npm run check` passed all 10 evaluators. Historical Beads audit records retain old paths by design.
- **Next-time guidance:** Route executable repository commands through `src/local`; keep reusable implementations under `src/core/local`. Preserve old Beads records as audit history rather than rewriting them.
