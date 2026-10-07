# Injected fetch AllowEffects boundary

- **Unexpected hurdle:** The first full coverage attempt exhausted `/tmp`, and its aggregate check summary hid the resulting Jest failures. A workspace-local temp directory allowed a clean unit run. That run then exposed a missing moderation error-response branch because the test adapter always returned a successful submission response.
- **Diagnosis:** Ran the complete unit suite with bounded coverage shards and inspected `reports/coverage/coverage-final.json` to locate the single uncovered branch in `moderate.js`.
- **Fix:** Made injected `fetchFn` signatures permission-first throughout browser, cloud, and local core adapters, forwarded permissions at each call site, added enforcement coverage to the capability lint rule, and corrected the moderation test to inject a failed effect response.
- **Next time:** Keep Jest temp and coverage output under the workspace on constrained machines. When a coverage threshold fails, inspect the merged branch map and check whether mocks route around the branch under test.
