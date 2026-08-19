# JoyCon handler-shell mutation slice

- Unexpected hurdle: the exported handler shell had survivors even though its inner runtime initializer was covered.
- Diagnosis: no test exercised source-input hiding, managed-form insertion, or the form CSS class at the exported boundary.
- Chosen fix: added a direct handler-shell integration test with a minimal DOM facade and exact assertions for hiding, insertion, class assignment, and disposal.
- Evidence: the verified Stryker scan for lines 2264-2270 killed 3/3 mutants with 0 survivors and 0 timeouts; the focused Jest suite passed 95 tests, ESLint passed with zero warnings, and the diff check passed.
- Next-time guidance: test exported handler entry points separately from their internal orchestration helpers.
