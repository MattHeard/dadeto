## Special Input Helper

- **Outcome:** Added `ensureSpecialInput` and `createSpecialInputFactory` to `src/core/browser/inputHandlers/browserInputHandlersCore.js` and updated `ensureNumberInput` to use these helpers so the special control lifecycle (lookup/create/position) is shared and the numeric handler only plugs in its factory-specific details.
- **Unexpected hurdles & options considered:** Introducing the factory required passing `getInputValue` from `number.js` instead of importing it into the core helper to avoid a cycle with `browser-core.js`.
- **Lessons & follow-up ideas:** When centralizing DOM lifecycle helpers ensure their dependencies can be injected to prevent import cycles; the special-input helper pattern could be reused for other paired controls.
- **Open questions:** None.
