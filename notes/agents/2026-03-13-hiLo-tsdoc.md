# hiLoCardGame tsdoc loop (2026-03-13)
- unexpected hurdle: `tsdoc:check` complained that `hiLoCardGame`’s helper functions never narrowed `candidate.type`/`inputEvent.key`, so the hi-lo toy flooded the log with tsdoc-only type errors.
- diagnosis path: reran `npm run tsdoc:check` to confirm the exact TS2322/TS7053/TS2345 lines and inspected the offending helpers; observed that TypeScript still saw `key` as `string|undefined` and the label map as a string-only index.
- chosen fix: cast `candidate.type` to string after the guard, declare `labels` as `Record<number,string>`, guard `applyGuessWhenReady` against undefined keys, and assert `inputEvent` is `HiLoInputEvent` before routing.
- next-time guidance / open questions: keep small tsdoc loops focused on one toy; leave the overall `tsdoc:check` failure as evidence when other modules still lag.
