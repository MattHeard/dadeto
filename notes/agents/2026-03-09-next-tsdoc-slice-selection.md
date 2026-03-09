## Context

`dadeto-fdr1` re-ran `npm run tsdoc:check` after the earlier `keyboardCapture.js` cleanup to choose the next exact file-local slice.

## Selection

The next smallest stable file-local tsdoc slice is:

- [gamepadCapture.js](/home/matt/dadeto/src/core/browser/inputHandlers/gamepadCapture.js)

Current file-local errors at the top of the report:

- `syncToyInput(...)` receives `payload: Record<string, unknown> | null` where the helper expects a non-null payload
- a `number | null` value is passed where `number` is required
- `(Gamepad | null)[]` is returned where `Gamepad[]` is declared
- `Gamepad | undefined` is passed where `Gamepad` is required

## Why this target

- It owns the first four reported errors before the much larger `joyConMapper.js` failure block begins.
- The failures are file-local type-narrowing and contract-shape issues, which makes the slice smaller and more coherent than the broader `joyConMapper.js` cleanup.
- It fits the project rule to prefer isolated helper or local-surface files before the largest browser input-handler cluster.

## Next-time guidance

Pop `gamepadCapture.js` next as a bounded typed-JS / tsdoc fix bead, then re-run `npm run tsdoc:check` before deciding whether the following slice should be `joyConMapping.js`, `hiLoCardGame.js`, `symphony.js`, or part of `joyConMapper.js`.
