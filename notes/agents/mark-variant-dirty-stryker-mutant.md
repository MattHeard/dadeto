# mark-variant-dirty Stryker mutant

- Surviving mutant: `markVariantDirtyImpl` at the optional-chaining call site around `depsTyped?.updateVariantDirty`.
- Diagnosis: the mutant looked meaningful at first, but the call chain showed `markVariantDirtyImpl()` only reaches the update step after `resolveVariantReference()` succeeds. That path already requires a real deps object with `db`, so the optional chaining on `depsTyped` was not protecting a reachable runtime case.
- Cleanup performed: tightened the JSDoc/type contract, removed the redundant `depsTyped` alias, inlined `resolveDepsOrEmpty()` and `enforceDatabase()`, and simplified `resolveVariantReference()` to pass `db` straight through.
- Validation: updated the stale missing-db test expectation to match the actual destructuring failure, added fallback-helper coverage, and reran the full Jest suite successfully.
- Takeaway: when a mutant sits behind an already-required dependency chain, first check whether the code is defensive for an unreachable state before writing a test. In this case the right fix was to simplify the contract, not to add another branch-specific test.
