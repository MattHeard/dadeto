# Tetracube cloud playtest route

- Unexpected hurdle: the first playtest attempt stopped because this session had no interactive browser-control tool.
- Diagnosis: repository policy routes E2E through Cloud Run Jobs. The supported `gcp-test` workflow provisions an isolated temporary `t-*` site and uses `test/e2e/cloud.config.ts`; the existing cloud Playwright `testMatch` omitted Tetracube. A leftover September job was stale and was not used.
- Fix: added a focused cloud Playwright interaction trace for touch controls, keyboard rotation/place/undo, a deterministic tower with an overhang, mining, reset, movement, and flight. The trace attaches a screenshot and a machine-readable record that says enjoyment was not assessed.
- Next-time guidance: run the test only through a fresh `gcp-test` temporary deployment. Inspect the attached screenshot and test result for mechanics evidence; obtain a human playtest before recording subjective enjoyment or closing the full Tetracube spec.
