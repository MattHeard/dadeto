# Threefold empty Field Notes fallback coverage

- Unexpected hurdle: The menu tests had an empty-journal scenario, but its fixture always provided an initialized `threefold` object, leaving the missing-state fallback untested.
- Diagnosis: `itemsFor()` defaults absent `frame.threefold`, `witnessLedger`, and testimony account arrays before composing the no-notes state.
- Fix: Changed the empty Field Notes regression to supply a valid world frame with no `threefold` property and assert the empty-notes menu still renders.
- Evidence: Focused menu Jest passed 13/13. `/tmp/threefold-menu-missing-frame-coverage/coverage-final.json` records both outcomes for `page.js:547` and `:548` as `[8,2]`, and the no-records condition at line 591 also exercises both outcomes. The focused command exits nonzero only because it applies repository-wide 100% thresholds to a one-file suite. Elevated `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 gates across six impact shards. Spec-cache refresh and `git diff --check` passed.
- Next: Continue from exact-head Full Check coverage artifacts. Keep Rank 2 active until its broader acceptance and required global coverage are complete.
