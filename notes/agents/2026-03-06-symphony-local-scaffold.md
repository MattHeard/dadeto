## dadeto-p3de

- Unexpected hurdle: the repo did not yet have the `WORKFLOW.md` file that the first Symphony slice was supposed to load, so the scaffold needed to handle both the missing-file case and the now-present local policy surface.
- Diagnosis path: checked the repo root for `WORKFLOW.md`, read the existing `src/local/` writer server shape, and compared that against the earlier local-first Symphony note before choosing the smallest runnable surface.
- Chosen fix: added a Dadeto-local Symphony scaffold under `src/local/symphony/` with config loading, workflow loading, file-backed status/log writing, a status endpoint, a start script, and a minimal root `WORKFLOW.md` plus `tracking/symphony.local.json`.
- Next-time guidance: keep future Symphony loops local-first until one bead can be claimed and reported end to end; only then extract stable tracker/workspace/state pieces into `src/core/`.
