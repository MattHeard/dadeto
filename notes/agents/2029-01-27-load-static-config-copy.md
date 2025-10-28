## Entry core static config copy verification

- Questioned whether the static site build copies the new core loader into the public bundle.
- Exercised the copy workflow and added a regression test to ensure the core/browser tree pushes `load-static-config-core.js` into the deployment output.
