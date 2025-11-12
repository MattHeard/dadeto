## Complexity warning cleanup
- Unexpected hurdle: the lint output is huge, and my first Python scan miscounted because it didn’t scope to `src/core/browser`, so I had to iterate—using `rg` plus a tighter script—to isolate the ten functions flagged at complexity 5 before refactoring.
- Refactoring takeaway: each flagged entry now delegates the branching logic to a small helper (e.g., `attachSignOutLink`, `ensureGoogleIdentityAvailable`, `resolveValidPageVariant`, `setElementVisibility`, `createWarningLogger`, `ensureStaticConfigResponseOk`, `parseAuthedResponse`, and the CSV row/record helpers), which keeps the control flow of the exported helpers clear while lowering their ESLint complexity.
- Learned: when lint reports are long, isolate the relevant section first so you don’t chase phantom warnings; small helper extraction is an easy win for reducing cyclomatic counts without changing behavior.

Open questions:
1. Should future refactors continue to treat the ESLint complexity rule as a strict ceiling, or can we occasionally accept a 4+ when additional helpers would be too noisy?
2. Would it make sense to add targeted tests or benchmarks for these helpers, or is lint coverage sufficient for now?
