# Textarea handler refactor

- **Challenge:** Locating functionally identical helpers in `src/core/inputHandlers` without lint guidance took a manual scan across the handlers. Both the number and textarea handlers maintained separate implementations that synced the text input value.
- **Resolution:** Compared the helper bodies to confirm they matched, then reused `createUpdateTextInputValue` from the number handler inside the textarea handler to eliminate duplication.
