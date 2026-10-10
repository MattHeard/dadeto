# Toy disposer decomposition

- Unexpected hurdle: `createDispose` captures the five config values when the disposer is created; reading from the config object later would change behavior if callers replace its properties before cleanup.
- Diagnosis path: inspected the factory and its call sites/tests, including the object-backed `rowData` path and the legacy array fallback. Kept the in-place mutation and the order of disposer callbacks, DOM clearing, and row reset.
- Chosen fix: retain the exported config-object API, capture each reference at factory time, and delegate DOM clearing and row-state reset to named helpers. Added a regression that replaces config properties after factory creation and confirms cleanup still uses the captured references.
- Next-time guidance: preserve both reference capture and mutation order when extracting callbacks from configuration objects. `src/core/browser/toys.js` still has 16 findings; the next reported function is `enableInteractiveControls` (effective arity 5). Continue one function at a time without suppressions.
