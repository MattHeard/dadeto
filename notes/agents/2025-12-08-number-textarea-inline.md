## Unexpected insights
- Inlining `createUpdateTextInputValue` inside `ensureNumberInput` made it obvious how tightly coupled the DOM value sync is to the hidden text input, so the inline event handler now handles the DOM update and `setInputValue` in one place without needing the shared helper.
- The textarea helper still triggers the ESLint complexity warning even after refactoring; the code is short and readable enough that keeping the inline guard and the warning seems reasonable for now.

## Follow-ups
- If more handlers need the same syncing strategy, consider extracting a recomposed helper that can be shared without overthrowing the current inline layout.
