# Parameter-bag arity inventory refresh

- Unexpected hurdle: the saved global report and its next-file recommendation were stale; the documented Playwright runner target had already been fixed.
- Diagnosis: enabled the registered rule through a temporary ESLint API alias and scanned `src/core` plus `test` without cache or inline config. The first CLI override could not resolve the config-scoped plugin, and the first full API attempt stalled; the API run eventually emitted the report while being stopped.
- Evidence: `.tmp/parameter-bag-global-current.json` contains 103 findings across 80 files. `src/core/local/gcp-simulator/playwright-runner.js` has 0. The largest current cluster is `src/core/cloud/update-variant-visibility/update-variant-visibility-core.js` with 5 findings, followed by `src/core/cloud/render-variant/render-variant-core.js` with 4.
- Next loop: decompose the five transport-only bags in `update-variant-visibility-core.js` while preserving the newly added AllowEffects path; require a fresh per-file scan at 0 and focused behavior coverage before selecting another target.
- Next-time guidance: scan smaller directory batches and check that a CLI rule override can see its plugin before launching an expensive full-tree diagnostic.
