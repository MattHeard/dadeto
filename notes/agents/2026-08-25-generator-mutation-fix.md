# Generator mutation fix

- Unexpected hurdle: the full generator test glob included source-inspection tests and a CSS fixture test that cannot run inside Stryker sandboxes. The authoritative scan used eight runtime-focused suites after proving the broad dry run was invalid.
- Diagnosis: runtime survivors were concentrated in manual content rendering, beta article classes, related-link edge cases, and selected-method/default output branches; static page-shell mutations were equivalent template boundaries.
- Fix: added exact assertions for manual IDs/titles/markdown/toggle markup, beta article classes, empty and falsy related-link data, and text input defaults. Added narrow Stryker boundaries for reviewed static shell templates and equivalent defensive normalization guards.
- Evidence: focused Jest passed 8 tests; final runtime-focused scan instrumented 531 mutants with 372 killed, 157 explicitly ignored, 2 no-coverage, 0 survivors, and 0 timeouts.
- Next-time guidance: exclude source-inspection and unavailable-asset tests from per-file Stryker runs only after recording the dry-run failure and retain a stable runtime-focused test list.
