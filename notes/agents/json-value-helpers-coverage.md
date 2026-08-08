# JSON value helpers coverage

- The bare re-export was not instrumentable under focused Babel coverage and reported 0%.
- Replaced it with a documented forwarding function and tested object, array, and invalid JSON forwarding behavior.
- Evidence: bead `dadeto-4wj` records the focused Jest command passing 1 test at 100% statements, branches, functions, and lines.
