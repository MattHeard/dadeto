# Threefold menu close-navigation input coverage

- Unexpected hurdle: The controller-only menu suite tested item selection and menu rendering but lacked explicit regressions for B, X, and Y dismissal paths.
- Diagnosis: Full Check showed the input edge guards and main/subsection return branches at `page.js:721-723` were uncovered.
- Fix: Added one controller regression that uses B and X to return from How to Play, B to close the main menu, and Y to close it again; it verifies visibility and calls to `runtime.resume`.
- Evidence: Focused menu Jest passed 16/16. `/tmp/threefold-menu-close-input-coverage/coverage-final.json` shows `page.js:721` `[1,210]`, `:722` `[3,207]` (and `edge('b') || edge('x')` `[210,208]`), and `:723` `[1,2]`. Elevated `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 gates across six impact shards. Spec refresh and `git diff --check` passed.
- Next: Continue from the latest completed Full Check artifact; no coverage thresholds or exclusions have changed.
