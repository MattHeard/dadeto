## Textarea Disposer Helper

- **Outcome:** Added `createTextareaDisposer` adjacent to `setupTextarea` in `src/core/browser/inputHandlers/textarea.js` so the textarea handler mirrors the numeric input’s disposer helper and keeps the cleanup wiring concise.
- **Unexpected hurdles & options considered:** None—this refactor is narrowly scoped and only extracts the existing inline disposer factory.
- **Lessons & follow-up ideas:** When common wiring patterns recur across input setups, introduce small disposer factories to keep the setup functions clean.
- **Open questions:** None.
