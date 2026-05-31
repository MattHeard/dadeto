# Lint and Poll Coverage Cleanup

- Unexpected hurdle: the lint sweep surfaced a small set of JSDoc and ternary warnings in the Notion codex helpers, and the coverage pass then exposed a missing poll branch for a pid-less active run.
- Diagnosis: most warnings came from a few helper modules rather than the whole tree; the final coverage gap was a helper branch that no existing poll test exercised.
- Chosen fix: added explicit helper JSDoc, replaced remaining ternaries with named branches, and added a poll test for an active run without a pid.
- Next-time guidance: when a helper refactor changes coverage, check the exact uncovered line and add the smallest state-based test that reaches it.
