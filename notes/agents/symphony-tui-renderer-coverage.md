# symphony tuiRenderer.js coverage

- Unexpected hurdle: the existing renderer test covered only expanded/compact status output, leaving helper defaults and fallback branches untouched.
- Diagnosis: Istanbul identified uncovered default arguments, unavailable status, empty event/evidence sections, queue sizing, active-run fallbacks, and version mismatch rendering.
- Fix: added focused helper and integration cases; exposed two existing internal helpers through the module's test utility seam so their bounded-return paths are directly exercised.
- Evidence: strict focused Jest passed at 100% statements, branches, functions, and lines.
