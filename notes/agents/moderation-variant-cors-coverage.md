# Moderation variant CORS coverage

- The facade was a bare re-export and focused Babel coverage reported 0% despite its existing four-test behavior suite.
- Replaced it with a documented forwarding function while preserving the existing tests.
- Evidence: bead `dadeto-nif` records the focused Jest command passing 4 tests at 100% statements, branches, functions, and lines.
