# Generate Stats Thin Wrapper

Unexpected hurdle: `src/cloud/generate-stats/index.js` looked simple at first, but moving the wiring into a core helper exposed a few coverage branches that only showed up in the global `npm test` run.

Diagnosis: the helper had a couple of easy-to-miss branches in the Firestore database-id parser and the CORS origin callback, and the entrypoint still carried an unnecessary nullish fallback.

Chosen fix: moved the cloud wiring into `src/core/cloud/generate-stats/run.js`, added focused tests for the helper and wrapper, and filled the uncovered parser and CORS paths until the global coverage bar returned to 100%.

Next-time guidance: when splitting a cloud entrypoint, add one focused helper test and one wrapper test immediately, then run the full suite before assuming the branch coverage is done.
