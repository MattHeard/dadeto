`assertFieldValue` was being flagged for complexity because it was doing two checks inside the same function; I moved each guard into its own helper (`ensureFieldValueHasTimestamp`, `ensureFieldValueHasIncrement`) and introduced a reusable `ensureFunction` so the primary assertion just orchestrates the helpers. That let ESLint count only two simple statements and dropped the number of `src/core` warnings by one (205 remain) while preserving the same runtime behavior.

Tests were rerun (`npm test`) because of the helper changes, and the lint count was refreshed (`npm run lint`) so the new warning total can be compared directly.

Open question: would it make sense to document a standard helper like `ensureFunction` centrally so we can reuse it across similar validators instead of redefining it per file?
