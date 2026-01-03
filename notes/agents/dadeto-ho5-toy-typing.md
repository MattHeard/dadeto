## Toy Helper Typing

- **Unexpected hurdle:** `tsdoc-check-output.txt` kept reusing past runs, so grepping it made it look like the toy files were still failing even after the fixes. I ended up running `npx tsc --project tsconfig.jsdoc.json --pretty false | rg <file>` to confirm the new output because the real `tsc` run no longer reported those files.
- **Diagnosis & option from there:** stronger JSDoc/type guards and explicit casts resolved the remaining issues. Switching the inline reducer in `get.js` to a named helper eliminated the implicit-`any` complaint, and the new `isBaitError` guard plus optional chaining inside `fishingGame` removed the discriminated-union noise.
- **Learning / next step:** keep the toy helper bead closed and move on to `dadeto-nmo` (cloud render/submit helpers) so the epic can finish; tsdoc still fails in those cloud/presenter files, so the next phase needs similar targeted typedefing there.
