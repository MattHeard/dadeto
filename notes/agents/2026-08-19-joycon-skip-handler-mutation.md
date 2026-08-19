# JoyCon skip-handler mutation slice

- Unexpected hurdle: the skip handler had four survivors despite its lower-level helpers being covered.
- Diagnosis: no test invoked the handler boundary that combines auto-start, payload synchronization, control advancement, and rendering.
- Chosen fix: exported the existing skip handler through the test-only surface and added a focused behavioral test for all four effects.
- Evidence: the targeted Stryker scan for lines 2212-2230 killed 4/4 mutants with 0 survivors and 0 timeouts; the focused Jest suite passed 91 tests, ESLint passed with zero warnings, and the diff check passed.
- Next-time guidance: test event handlers at their public behavior boundary in addition to testing the helpers they compose.
