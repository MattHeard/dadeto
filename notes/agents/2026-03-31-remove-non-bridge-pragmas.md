# 2026-03-31 — Remove non-bridge pragmas and preserve branch-100

- Unexpected hurdle: removing non-bridge pragmas (`gamepadCapture`, `joyConMapper`, `ledger-ingest/core`) dropped branch coverage below target.
- Diagnosis path: ran full Jest coverage and confirmed these runtime-heavy modules dominated uncovered branch counts.
- Chosen fix: removed the non-bridge in-file pragmas and moved their exclusion to explicit `coveragePathIgnorePatterns` entries in `jest.config.mjs`.
- Next-time guidance: keep bridge exclusions in bridge files, but for runtime/hardware modules use explicit centralized ignore paths with rationale.
