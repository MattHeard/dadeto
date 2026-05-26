# Coverage loop note (2026-05-26)

- **Unexpected hurdle:** Full `npm test -- --watchman=false` still fails global 100% coverage thresholds despite all suites passing.
- **Diagnosis path:** Used Jest coverage output to identify uncovered branches and lines, then added focused tests for `textUtils` underflow pluralization and `stateStore` normalization/read branches.
- **Chosen fix:** Added targeted assertions that execute previously missed branches in `generateFeedback` and `normalizeNotionCodexState`/`readState` paths.
- **Next-time guidance:** Keep iterating on remaining uncovered branch paths reported by global coverage summary; run focused `jest` on impacted suites first before full `npm test`.
