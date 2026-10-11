# Duplication gate arity cleanup

- Unexpected hurdle: the existing lint count included an eight-field executor argument and a three-field report-path context, both immediately unpacked.
- Diagnosis: the normalized gate dependencies form one execution configuration, while clone-failure presentation needs only a precomputed relative report path.
- Fix: retain the normalized dependency record as a cohesive value in `executeDuplicationGate`; pass the report's relative path directly to `handleCloneFailure`.
- Evidence: fresh target no-cache arity lint is empty; `test/scripts/check-duplication.test.js` passed all 14 tests; `npm run duplication` reported zero clones; elevated `npm run check` passed all ten checks. Fresh global inventory is 44 findings across 43 files. Artifact: `.tmp/parameter-bag-global-after-check-duplication.json`.
- Next time: continue the parameter-bag rollout in `src/core/scripts/function-dependency-graph-core.js`, which currently has two findings.
