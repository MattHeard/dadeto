# API key credit create-db coverage

- The facade was a bare re-export plus a marker, which gave no instrumentable forwarding path for direct coverage.
- Replaced the re-export with a documented forwarding function and tested named, default, and fallback database configuration.
- Evidence: bead `dadeto-8lj` records the focused Jest command passing 2 tests at 100% statements, branches, functions, and lines.
