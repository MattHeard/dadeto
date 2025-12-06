## Container Handler Helper

- **Outcome:** Consolidated the `createContainerHandlerInvoker` helper inside `src/core/browser/inputHandlers/browserInputHandlersCore.js` and imported it back into the text/number handlers so the cleanup loops share a single definition instead of duplicating the logic.
- **Unexpected hurdles & options considered:** None—duplication was obvious, so I opted not to duplicate the helper again when moving it; no extra cleanup was necessary beyond updating imports.
- **Lessons & follow-up ideas:** Keep the shared handler list pattern in mind when adding new input types so more helper utilities can stay centralised.
- **Open questions:** None.
