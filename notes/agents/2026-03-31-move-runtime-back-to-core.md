# 2026-03-31 — Move runtime implementations back to src/core

- Unexpected hurdle: moving runtime implementations out of `src/core` broke expected code ownership and did not satisfy reviewer intent.
- Diagnosis path: compared latest commit diff and restored ownership by copying runtime implementations back into original core module paths.
- Chosen fix: removed `src/browser/**` runtime files, restored full implementations in `src/core/**`, and added a first incremental handler test for `joyConMapperHandler`.
- Next-time guidance: keep runtime implementation in `src/core` unless explicitly asked to split; use incremental branch-coverage tests rather than large structural moves.
