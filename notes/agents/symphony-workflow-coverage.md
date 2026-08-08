# Symphony workflow coverage

- Hurdle: the broad Symphony test suite could not load an unrelated runtime-version module under the CommonJS Jest transform.
- Diagnosis: the workflow core has no runtime-version dependency and can be verified directly with injected path and file readers.
- Fix: add a focused core suite for front matter, markdown sections, missing-file fallback, and non-missing error propagation.
- Guidance: test this parser directly when adapter-level Symphony suites are blocked by unrelated ESM-only imports.
