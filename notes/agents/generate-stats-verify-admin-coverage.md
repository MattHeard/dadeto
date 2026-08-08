# Generate-stats verify-admin coverage

- The facade was a bare re-export plus a marker and had no instrumentable statements under focused collection.
- Replaced it with a documented forwarding function and tested the missing-token middleware path and marker.
- Evidence: bead `dadeto-ink` records the focused Jest command passing 1 test at 100% statements, branches, functions, and lines.
