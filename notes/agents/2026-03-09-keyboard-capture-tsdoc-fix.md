## Context

`dadeto-t33b` targeted the current typed-JS / `npm run tsdoc:check` failure in `src/core/browser/inputHandlers/keyboardCapture.js`.

## What changed

I narrowed the `closest('article.entry')` boundary in `keyboardCapture.js` by changing the helper to accept `Element | null | undefined` and cast the non-null result at the boundary before returning `HTMLElement | null`.

## Why this shape

The original checker failure came from `closest()` returning `Element | null`, while the helper promised `HTMLElement`. A stricter runtime guard using `HTMLElement` fixed the type error but broke the Jest fixture because that test uses a plain-object `closest()` stub. The final version keeps runtime behavior unchanged and limits the typing fix to the file-local boundary.

## Evidence

- `npm run tsdoc:check` no longer reports `src/core/browser/inputHandlers/keyboardCapture.js`.
- `npm test` passed after the fix.
