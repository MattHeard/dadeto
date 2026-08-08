# Firestore helpers coverage

- Unexpected hurdle: the helper module had no direct coverage despite related Firestore-handle tests passing.
- Diagnosis: focused coverage of `src/core/cloud/firestore-helpers.js` reported 0% because the existing tests did not import it.
- Fix: added direct tests for explicit and environment-derived database IDs, invalid configuration, named/default database selection, and instance creation.
- Evidence: bead `dadeto-6kk` records the focused Jest command passing 9 tests at 100% statements, branches, functions, and lines.
