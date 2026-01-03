# LocalStorageLens complexity tweak

- **Surprise:** The lint warning referenced `isMissingStoredValue` despite earlier helper `isNullish`, so the fix was just to reuse that helper instead of adding new conditionals.
- **Diagnosis:** ESLint flagged complexity 3 at line 157 (`value === null || value === undefined || value === ''`). Moving the guard into `isNullish` preserved the intent and dropped the triple OR from the function under scrutiny.
- **Learning:** Small delegation changes can eliminate complexity warnings without touching the behavior; always see if an existing guard can be reused instead of rewriting the whole expression.
