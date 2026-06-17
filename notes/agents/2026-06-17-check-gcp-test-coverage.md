# 2026-06-17 check gate recovery
- Unexpected hurdle: the `npm run check` run split into a duplicated scanner helper in `src/core/scripts/check-depcruise.js` and repo-wide lint warnings in `realtimeVoicePrototype.js` plus a couple of test files.
- Diagnosis path: reran the specific gates (`duplication`, `tsdoc:check`, `lint`, and a focused Jest file) and used the lint report plus coverage output to pinpoint the remaining failures instead of guessing.
- Chosen fix: tightened the depcruise helper until the direct code paths were covered, added the missing JSDoc and test coverage hooks, and cleaned the two test call sites that were only tripping warnings.
- Next-time guidance: when `npm run check` is the target, read `reports/lint/lint.txt` and the coverage table directly after the first aggregate run; they usually identify the shortest path to a clean finish.
