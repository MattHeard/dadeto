# entriesToObject inline cleanup

- Hurdle: `entriesToObject` had become a thin wrapper over `Object.fromEntries`, so it was carrying a name without any behavior.
- Diagnosis: every call site was already using tuple lists, and the wrapper added no branching, validation, or transformation.
- Fix: removed `entriesToObject`, updated the source call sites to `Object.fromEntries`, and let the build regenerate the mirrored public files.
- Next-time guidance: when a helper is just a direct pass-through to a built-in, prefer the built-in unless the wrapper encodes domain meaning that the caller cannot express locally.
