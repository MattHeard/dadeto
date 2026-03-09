## Context

`dadeto-g1l4` targeted a small duplicate helper slice around the dated toy `hiLoCardGame.js`.

## What changed

- Exported the existing optional-string normalizer from [commonCore.js](/home/matt/dadeto/src/core/commonCore.js) as `getStringCandidate`.
- Replaced the local `getOptionalString` copy in [hiLoCardGame.js](/home/matt/dadeto/src/core/browser/toys/2026-03-01/hiLoCardGame.js) with the shared helper import.

## Evidence

- Before the change, `npm run duplication` reported a clone between `src/core/commonCore.js` and the local `hiLoCardGame.js` optional-string helper.
- After the change, that specific `commonCore.js` ↔ `hiLoCardGame.js` clone no longer appears in the duplication output.
- `npm test` passed with `473` suites and `2317` tests.

## Next-time guidance

For tiny value-normalization helpers that already exist in `src/core/commonCore.js`, prefer reusing the shared export instead of keeping a one-off toy-local copy.
