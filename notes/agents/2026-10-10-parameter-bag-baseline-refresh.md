# Parameter-bag lint baseline refresh

- Unexpected hurdle: the lint rule is attached only to selected files in the main ESLint config, so a direct CLI rule override could not resolve its plugin namespace repository-wide.
- Diagnosis path: reused the rule factory in a temporary flat-config overlay and ran ESLint without cache across `src/core` and `test`.
- Chosen fix: no source change in this characterization loop. The fresh report has 167 findings across 90 files; the largest cluster is `src/core/cloud/render-variant/render-variant-core.js` with 14.
- Evidence: `.tmp/parameter-bag-current.json`; command `npx eslint --config .tmp/parameter-bag-scan.config.js src/core test --no-cache --format json` exited 1 as expected because it reports existing findings. Report parsing confirmed 167 / 90, led by the render-variant core file.
- Next-time guidance: keep the temporary diagnostic config under `.tmp` and use the refreshed report to select one function at a time. First candidate is `propagateVisibilityDelta`, which packs five inputs and directly updates Firestore references; review its effect boundary before decomposition.
