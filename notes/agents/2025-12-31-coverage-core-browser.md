# Core/browser coverage push (2025-12-31)

- **Surprise**: `npm test` kept core/browser at 99.88 despite touching createSectionSetter because the non-Error branch of `extractErrorDetail` and the re-export shim (`common-core.js`) never executed, leaving “uncovered line #145” and an entire file at 0%.
- **Diagnosis & fix**: Added tests that exercise the successful merge path and the fallback error-path so the missing branch is hit, and introduced a `browserCommonCore` binding in `src/core/browser/common-core.js` to force that module to run (its previous `export *` alone never emitted executable statements). These targets pushed every file in `core/browser` to 100%.
- **Learning**: Re-export-only modules may report zero coverage even when imported, so either add a tiny runtime binding or capture them in a dedicated smoke test; likewise, the error-protection helpers get hit when you throw non-Error values from the injected dependencies.
- **Next steps/Questions**: Do we want to document this “add a binding when re-exporting” pattern in the testing checklist so future agents don’t chase mysterious 0% modules?
