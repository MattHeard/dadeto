# AlgZoo preregistration loop

- **Unexpected hurdle:** The Notion spec had broader pilot and harness acceptance criteria than could be completed safely in one loop; the study must remain outcome-free until its design is frozen.
- **Diagnosis:** Reviewed the current spec, checked the pinned local AlgZoo fixture and replay code, and separated requirements for a preregistration from requirements for the harness and pilot.
- **Chosen fix:** Added `docs/interpretability/algzoo-preregistration.md` with pinned inputs, paired arms, target order, scoring thresholds, leakage checks, cost limits, analysis rules, sensitivity plan, and a prelaunch manifest/hash procedure. No pilot was run and no outcomes were inspected.
- **Evidence:** `git diff --cached --check` passed. `DADETO_CHECK_TIMEOUT_MS=7200000 DADETO_COVERAGE_SHARD_SIZE=40 npm run check` passed all 10 aggregate gates, including all unit coverage shards and 11/11 local E2E tests; duplication reported 0 clones.
- **Next time:** Build the deterministic harness with stubbed and live map retrieval and blinded local/whole-model evaluators. Verify access isolation before any assignment, record the manifest and its hash in Git, and do not inspect held-out outcomes before submissions are locked. Then run the feasibility pilot and use it to design a separate confirmatory protocol.
