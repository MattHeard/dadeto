# process-launcher.js coverage

- Unexpected hurdle: the existing launcher tests covered normal process startup but not resolver fallbacks, rejected close handles, or rejected exit hooks.
- Diagnosis: strict Istanbul output isolated the remaining log-directory fallback branches after the first additions.
- Fix: added focused tests for all resolver variants, empty and failing close operations, default exit payloads, exit-hook error reporting, and missing repository-root fallbacks.
- Evidence: strict focused Jest passed at 100% statements, branches, functions, and lines.
