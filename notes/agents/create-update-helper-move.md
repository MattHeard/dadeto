# Moving `createUpdateTextInputValue`

- **Unexpected hurdle:** Relocating the helper to `browserInputHandlersCore.js` created a circular dependency with `browser-core.js` because that file already imports `DENDRITE_FORM_SELECTOR` from the same module.
- **Diagnosis & options considered:** Instead of touching `browser-core.js`, I kept the helper in the shared input-handlers core but imported `setInputValue` directly from `inputValueStore.js`, breaking the cycle while keeping `browser-core.js` focused on DOM helpers.
- **What I learned:** Shared utilities that need value-store helpers should pull them from as close to the data layer as possible to avoid pulling in high-level modules with their own cross-file constants.
- **Follow-ups/open questions:** None; tested via `npm test -- test/browser/toys.createUpdateTextInputValue.test.js` and `npm test -- test/inputHandlers/textareaHandler.test.js`.
