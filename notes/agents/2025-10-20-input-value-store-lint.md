## Context
Resolved eslint `no-ternary` and `complexity` warnings in `src/core/browser/inputValueStore.js` by extracting a normalization helper and relying on nullish coalescing for retrieval.

## Outcome
`npx eslint src/core/browser/inputValueStore.js` now passes without warnings, and the helper ensures consistent handling of nullish values.
