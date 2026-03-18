# dadeto-ikcg runner loop
- unexpected hurdle: the initially suggested `gamepadCapture.js` front was already clean in `tsdoc:check`, so the first real file-local tsdoc slice had to be reselected from the remaining checker output.
- diagnosis path: reran `npm run tsdoc:check -- --pretty false` and narrowed the first remaining file-local hit to `src/core/browser/toys/2025-05-08/battleshipSolitaireFleet.js`; the reducer helper was relying on a separate boolean guard that `checkJs` did not use for narrowing.
- chosen fix: replaced the helper-mediated null check with a direct `acc === null || placed === null` guard at the push site so the accumulator and candidate are explicitly non-null before `push`.
- next-time guidance / open questions: keep the next tsdoc beads equally file-local; if `checkJs` does not narrow through a helper, use an explicit guard at the use site instead of widening into adjacent modules.
