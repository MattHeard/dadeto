# 2026-03-18: dadeto-4lwn next-bead selection
- Unexpected hurdle: the stored branch artifact for `captureFormShared.js` was already stale relative to the current `coverage-final.json`; the module itself now reads as fully covered.
- Diagnosis path: checked `reports/coverage/coverage-summary.json` for the smallest remaining non-100 branch slice and then verified the file-level branch map for `src/core/browser/inputHandlers/captureFormShared.js`.
- Chosen fix: created a follow-up bead for `src/core/browser/inputHandlers/keyboardCapture.js`, where `coverage-final.json` still shows one uncovered branch at the `if (!capturing)` guard in `handleKeyboardEvent`.
- Next-time guidance: if the summary and branch map disagree, trust the fresh branch map first and treat the summary as planning input only after a re-run of `npm test`.
