# dadeto-pto6 runner loop
- unexpected hurdle: the newest duplication slice spanned both gamepad and keyboard capture handlers, so removing the shared logic meant touching two busy files.
- diagnosis path: reran `npm run duplication` and inspected both handlers to confirm the repeated Escape-key gate and release path.
- chosen fix: introduced `escapeKey.js` as a shared helper for the Escape key constant/matcher and wired both handlers through it.
- next-time guidance: keep watching the duplication report for the next highlighted cluster (currently the `gamepadCapture.js` vs `toys/2026-03-01/hiLoCardGame.js` slice) before widening the cleanup scope.
