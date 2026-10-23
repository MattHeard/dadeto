# Tetracube cloud playtest route

- Unexpected hurdle: the first playtest attempt stopped because this session had no interactive browser-control tool.
- Diagnosis: repository policy routes E2E through Cloud Run Jobs. The supported `gcp-test` workflow provisions an isolated temporary `t-*` site and uses `test/e2e/cloud.config.ts`; the existing cloud Playwright `testMatch` omitted Tetracube. A leftover September job was stale and was not used.
- Fix: added a focused cloud Playwright interaction trace for touch controls, keyboard rotation/place/undo, a deterministic tower with an overhang, mining, reset, movement, and flight. The trace attaches a screenshot and a machine-readable record that says enjoyment was not assessed.
- Production-chain hurdle: every successful `gcp-test` previously triggered production Terraform apply, which blocked manual playtests without a separate production approval.
- Workflow guard: `gcp-prod` now runs from a successful scheduled `gcp-test` only. A manual test dispatch remains isolated; direct production dispatch remains available. Regressions are covered in `test/scripts/gcp-prod-workflow.test.js` and `test/scripts/get-author-uuid-v2-playwright-workflow.test.js`.
- Validation: those focused suites passed 8 tests; elevated `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 gates and 1,042 suites / 7,585 tests across six shards, with zero clones.
- Next-time guidance: after the guard is merged, run the test only through a fresh manual `gcp-test` temporary deployment. Inspect the attached screenshot and test result for mechanics evidence; obtain a human playtest before recording subjective enjoyment or closing the full Tetracube spec.
