# Depcruise core-random policy

- Unexpected hurdle: the new depcruise wrapper immediately flagged itself because the scanner looked for the banned text inside `src/core/scripts/check-depcruise.js`.
- Diagnosis path: I checked the failing coverage and the wrapper source, then separated the policy scan from the implementation text and added direct tests for the scanner helpers.
- Chosen fix: the wrapper now runs depcruise first, then separately scans `src/core` for direct random usage and reports violations through the same gate.
- Next-time guidance: when adding repo policy wrappers, cover the default writers and helper branches in the wrapper test file right away so the global 100% coverage gate stays green.
