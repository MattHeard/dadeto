## joyConMapper capture loop failure

- Unexpected hurdle: replacing the capture callbacks with map/filter/reduce plus slice-local helpers increased lint warnings because the repo counts complexity on each extracted helper as aggressively as the original callbacks.
- Diagnosis path: compared the bead baseline against a file-scoped ESLint run on `src/core/browser/inputHandlers/joyConMapper.js` using `./node_modules/.bin/eslint src/core/browser/inputHandlers/joyConMapper.js --no-color --format stylish`.
- Chosen fix: revert the helperized attempt and leave the file unchanged instead of committing a worse warning profile.
- Next-time guidance: keep the work in `detectButtonCapture` and `detectAxisCapture`, but test guard flattening inside the existing callbacks before adding any new function signatures.
