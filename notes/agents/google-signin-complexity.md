# Google sign-in complexity refactor

- **What surprised me**: Extracting helpers triggered eslint's aggressive jsdoc rules. I expected complexity warnings but not the undefined-type complaints once I referenced `Console`/`NodeListOf`. The fix was to describe the logger and DOM helpers without relying on DOM-specific typedefs.
- **Diagnosis steps**: After the first lint pass I scanned `reports/lint/lint.txt` to confirm the new warnings and traced them back to the freshly-added helpers. Re-running `npm run lint` after each documentation tweak made it easy to verify the fixes.
- **Future tip**: When adding utility functions in this repo, budget time for jsdoc annotations and prefer plain object shapes over DOM type aliases to stay within the lint rules.
- **Follow-ups**: The Google admin surface still has many high-complexity functions (e.g. `regenerateVariant` at 13). Breaking those down further would keep future lint runs quieter.
