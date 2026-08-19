# Error-beacon mutation slice

- Unexpected hurdle: the initial survivor set included mutation targets that were behaviorally equivalent because Error stack handling duplicated the object-like path and unavailable URLs were sanitized through an empty-string fallback.
- Diagnosis: fresh serial Stryker scans narrowed 12 survivors to two equivalent targets after focused assertions covered circular serialization, stack shapes, and exact URL/dedupe behavior.
- Chosen fix: added focused behavioral assertions and removed the redundant Error-specific stack branch and URL nullish fallback, leaving one observable implementation path.
- Evidence: the final Stryker scan for `src/core/browser/error-beacon.js` executed 111 mutants and killed all 111 with 0 survivors and 0 timeouts. Focused Jest passed 29 tests, targeted ESLint passed with zero warnings, and `git diff --check` passed.
- Next-time guidance: when a survivor is equivalent by construction, refactor the duplicate path before adding increasingly artificial assertions; always rerun a fresh file-scoped scan after the refactor.
