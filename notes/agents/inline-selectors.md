# Inline selector cleanup

- **Unexpected hurdle:** Lint run specifically asked about duplicate imports, but the follow-up inline edit meant adding a constant that already existed elsewhere; it was tedious to ensure the change didn’t drift from the shared selector definition.
- **Diagnosis & options considered:** I could have left the shared selector in `constants` and kept the import, but the request to inline meant the getter is now entirely local, so I duplicated the literal while preserving its previous value.
- **What I learned:** When inlining shared constants, double-check for other consumers before removing the export; in this case the constant is still public in `src/core/constants/selectors.js`, so other modules are unaffected.
- **Follow-ups/open questions:** No follow-ups—lint is clean, but watch for divergence if the selector changes in multiple spots later.
