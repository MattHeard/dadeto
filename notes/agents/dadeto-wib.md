## dadeto-wib: Deduplicate localStorageLens helper

- **Surprises / diagnostics:** The duplication report really just pointed to two try/catch blocks and the guards around storage availability. Consolidating those patterns cuts the clone count without needing to change the public surface.
- **Work:** Added `withStorage` and `tryWithLog` helpers plus rewired `getFromStorage`, `setToStorage`, `safeGetItem`, `applyStorageValue`, `parseStoredJson`, and `stringifyStoredJson` to use them. Reran `npm run duplication` to confirm no new clones and removed the generated reports before committing.
- **Lessons / follow-up guidance:** Minimal helpers can eliminate localized clones without needing bigger refactors; keep the helper docs nearby so future contributors know why those patterns exist.
