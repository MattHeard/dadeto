# Threefold guide objective coverage

- Unexpected hurdle: the uncovered guide fallback looked like an untested unknown-scene behavior, but the scene resolver only emits a canonical scene key or `broken-gate`.
- Diagnosis: every canonical scene had a guide objective, so the generic `EXPLORE THE REGION` fallback was unreachable and its branch was dead source behavior.
- Fix: added a closed `ThreefoldSceneKey` union shared by the objective and label maps, made the resolver search that ordered key list, and removed the dead fallback. The existing missing-world-name regression still proves the Broken Gate default.
- Evidence: focused menu Jest passed 17/17; focused page coverage passed 17 tests; `npm run tsdoc:check` passed; elevated `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 gates and 1,045 suites / 7,664 tests; `npm run build`, spec refresh, and `git diff --check` passed.
- Next-time guidance: when global coverage points at a defensive fallback, first prove whether valid states can reach it. If not, encode the complete invariant in types/data and delete the stale branch instead of synthesizing invalid inputs.
