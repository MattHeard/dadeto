# Runner commitment query work budget

- Unexpected hurdle: the first implementation exceeded the repository's 50-line non-core limit, and a focused test run through the coverage wrapper failed its global branch threshold because it selected only one test file.
- Diagnosis: the Firestore adapter included both batching and projection orchestration; the coverage wrapper enforces whole-core coverage even when selecting a focused file.
- Fix: moved batch record retrieval into a small cloud adapter module, kept projection semantics unchanged, verified focused Jest without coverage, then ran the full check. A test with 100 commitments asserts one assignment query plus two batch reads.
- Next time: use `node scripts/run-jest.js --runInBand --runTestsByPath ...` for focused tests without the global coverage threshold. Avoid interrupting `test-watch`; it can leave a stale Jest slot lock. The scheduled deployed p50/p95 artifact remains a separate follow-up.
