# API key credit core coverage

- Hurdle: existing branch tests covered response mapping but left the request, Firestore, and Express adapter lifecycle largely untouched.
- Diagnosis: the missing paths were deterministic validation and serialization contracts, so they could be tested with in-memory Firestore and response doubles.
- Fix: add direct tests for UUID precedence, method and missing-ID validation, Firestore document states, fetch failures, and JSON/send response branches.
- Guidance: exercise both the pure handler and Express adapter when coverage includes layered request plumbing.
