# Render variant startup effects

- Unexpected hurdle: `render-variant` shared the render-support factory with `render-contents`, so moving Firebase startup out of core initially changed the other entrypoint's required inputs.
- Diagnosis: inspect both call sites and keep their lifecycle contracts explicit. `render-variant` now builds render state from an already initialized Firestore instance; the existing initializer path remains available for the separate render-contents audit.
- Chosen fix: the cloud entrypoint mints a startup capability for Firebase initialization, Firestore resolution, variant trigger registration, and tree-regeneration trigger registration. Permission-first adapters own the platform calls. Request-time variant writes continue through their existing fresh invocation boundary.
- Next time: when changing shared cloud composition helpers, inspect every caller before editing; distinguish startup construction from per-request effects. The remaining legacy render-support startup path is used by `src/cloud/render-contents/index.js`; audit it next before proceeding to later cloud entrypoints.
