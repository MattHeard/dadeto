# JSON Parser Shared

- Duplication remained between the ticTacToe toy and calculateVisibility because both defined the same try/catch parser, and the mutant suite loads ticTacToe via a `data:text/javascript` link so it cannot resolve normal relative imports.
- Moved `parseJsonOrFallback` into `src/core/browser/toys/browserToysCore.js` so the browser toys share it directly, while keeping `jsonUtils.js` focused on the lower-level helpers it already exposes.
- Relocated the low-level `safeParseJson` helper into `src/core/browser/browser-core.js`, rewiring every caller to import it from the browser bundle and keeping `jsonUtils.js` centered on `valueOr`.
- Worked around the `data:text/javascript` mutant harness by inlining the helper definitions (including `safeParseJson` and `valueOr`) instead of importing `browserToysCore`.

Testing:
- `npm run lint`
- `npm test`
- `npm run duplication`

Open question: confirm later whether additional toy mutant tests need similar inline helpers when they start importing new shared utilities.
