# Render Variant Thin Wrapper

Unexpected hurdle: `src/cloud/render-variant/index.js` was exporting helper symbols that nothing in the repo imported, but the file still counted against the non-core-thin gate.

Diagnosis: the actual cloud wiring was mixed with the entrypoint exports, so the size policy could be improved without changing the public behavior.

Chosen fix: moved the Firebase/function wiring into `src/core/cloud/render-variant/run.js` and kept `src/cloud/render-variant/index.js` as a minimal wrapper that only exports the cloud entrypoints.

Next-time guidance: when a non-core entrypoint grows past the limit, look for a core runner split first; that usually preserves behavior and makes the remaining surface easier to test.
