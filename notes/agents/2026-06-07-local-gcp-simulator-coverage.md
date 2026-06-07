# Local GCP Simulator Coverage

- Unexpected hurdle: the simulator landed cleanly, but `npm test` failed on the global coverage gate because the new `core/local/gcp-simulator` files were still mostly untested.
- Diagnosis path: I ran the full Jest suite, checked `reports/coverage/coverage-summary.json`, and then drilled into the simulator helpers until the remaining uncovered server and branch paths were visible.
- Chosen fix: I added focused tests for fake Firestore, fake storage, simulator failure paths, and the HTTP server bootstrap so the simulator code could be exercised without weakening the repo-wide threshold.
- Next-time guidance: when adding a new core runtime surface, add a dedicated coverage test file alongside the implementation before landing it, especially if the module owns bootstrap or fallback logic.
