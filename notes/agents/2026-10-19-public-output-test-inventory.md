# Public output test inventory — 2026-10-19

- Hypothesis: a test mentioning `public/` is not necessarily consuming generated output; the actual filesystem boundary and assertions determine its class.
- `test/core/copy.test.js`: source/unit contract. It constructs synthetic `/project` paths and exercises injected filesystem behavior; it does not read the checkout's `public/` tree.
- `test/core/scripts/generate/writeFormattedHtml.test.js`: source/unit contract. `public/*.html` is passed as a string to an injected writer; the test does not write or read real output files.
- `test/local/gcp-simulator.test.js`: local integration test. It configures the simulator's optional static directory, but its assertions cover simulated routes and fake storage. The whole suite passes while the checkout has no `public/` directory; it does not verify built static assets.
- `test/scripts/netlify-prod-workflow.test.js`: source-contract test. It reads the workflow and resolver source; `public/**` appears only in the workflow's source path filter.
- Evidence: with `public/` absent, the four focused suites passed (4 suites, 61 tests). The GCP simulator alone also passed 17 tests.
- Next time: when adding coverage for generated static files, build them in an explicit temporary fixture and assert those artifacts; do not infer artifact coverage from these path-only tests.
