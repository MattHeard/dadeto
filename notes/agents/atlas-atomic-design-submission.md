# Atlas atomic experiment-design submission

## Retrospective

- Unexpected hurdle: ordinary graph writes and immutable experiment-design submissions have different concurrency requirements.
- Diagnosis: a `loadBundle` → append → `saveBundle` sequence can lose concurrent designs even when each individual design validates.
- Fix: expose a dedicated injected atomic `submitExperimentDesign` storage operation, require it for design writes, and keep the serialized mutation queue inside the test storage adapter.
- Next time: make persistence concurrency guarantees part of the adapter contract and test concurrent writes plus V7 preservation through later ordinary writes.

## Evidence

- Focused interpretability suites: 3 suites / 27 tests passed.
- Scoped changed-core impact evaluator: 17 suites / 144 tests passed with 100% changed-core line and branch coverage.
- `npm run build`, `npm run tsdoc:check`, and the full local `npm run check` passed.
- No hosted storage, provider, inference, or paid operation was used.
