## Shared Input Disposer

- **Outcome:** Moved the `createInputDisposer` factory from `number.js` into `browserInputHandlersCore.js` (now exported at `src/core/browser/inputHandlers/browserInputHandlersCore.js:15-28`) so both number and textarea handlers consume the same helper instead of maintaining parallel definitions.
- **Unexpected hurdles & options considered:** Referencing `createRemoveListener` created a cycle with `browser-core.js`, so I reimplemented the removal inline (`dom.removeEventListener`) and kept the helper self-contained.
- **Lessons & follow-up ideas:** When multiple handlers share the same listener wiring, centralize the disposer to reduce duplication and keep the setup logic lean.
- **Open questions:** None.
