# Mark-variant-dirty verify-admin coverage

- The facade was a bare re-export plus a marker and had no instrumentable forwarding path under focused coverage.
- Replaced it with a documented forwarding function and preserved the existing seven-test verifier suite.
- Evidence: bead `dadeto-d6c` records the focused Jest command passing 7 tests at 100% statements, branches, functions, and lines; no pre-existing test content was removed.
