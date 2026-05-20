# gcp-test dendrite fixture

- Hurdle: the first seed helper landed under `src/`, which tripped the `non-core-thin` guard.
- Diagnosis: the repo only allows that check to stay green when non-core helpers live outside `src/`; moving the runner to `scripts/` keeps the fixture accessible without violating source layout rules.
- Fix: split the seed runner into `scripts/gcp-test-fixture.js`, kept the workflow pointed at it, and left the Playwright test in `test/e2e/dendrite-fixture.spec.ts`.
- Next time: start any new cloud-test harness outside `src/` unless it is part of the core product code, then let `npm test` catch layout regressions before touching GCP.
