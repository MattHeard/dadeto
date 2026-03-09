## Context

`dadeto-trjd` targeted the small shared parse/object-shape helper clone cluster spanning `src/core/browser/toys/2026-03-01/joyConMapper.js`, `src/core/browser/toys/2026-03-01/hiLoCardGame.js`, and `src/core/browser/presenters/joyConMapping.js`.

## What changed

I extracted two tiny shared helpers into `src/core/browser/jsonValueHelpers.js`:

- `parseJsonObject`
- `isObjectValue`

The three owned files now call those helpers instead of carrying their own local JSON-parse and object-shape checks.

## Why this shape

The duplication report pointed to short, repeated parsing/object helpers rather than game or presenter behavior. Moving only those primitives into one browser-level helper removes the owned cluster without forcing a broader abstraction across the toy state or presenter formatting paths.

## Evidence

- `npm run duplication` no longer reports the old `joyConMapper` ↔ `hiLoCardGame` and `joyConMapper` ↔ `joyConMapping` parse/object helper overlaps.
- Remaining duplication findings are other families, including the new shared helper against unrelated existing helpers.
- `npm test` passed after the extraction.
