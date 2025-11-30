# Render Contents Lint Push

## Hurdles & Surprises
- Working under the `complexity` limit of 2 is brutal because every tiny guard (even a single `if`) counts. Refactoring `createRenderContents` to pull helper functions out of the nesting helped keep the main factory smaller, but the repo still reports 84 complexity warnings because dozens of other guard helpers exist and can’t be simplified without larger-side changes.
- Adding coverage helpers meant exporting some internal functions (`resolveAuthorizationHeader`, `getHeaderFromHeaders`, `resolveHeaderValue`), which triggered strict JSDoc checks. Writing clean JSDoc for the new helpers was necessary to keep lint clean.

## What I Learned
- When you need to lower a function’s reported complexity, move nested helper definitions outside and document them carefully so that only the top-level logic remains. Use explicit exports for helpers only when tests need access, and guard them with thorough JSDoc to avoid new lint noise.
- Strict lint rules (complexity ≤2 + no ternary) make it hard to introduce new helpers; plan for doc comments and keep helper bodies very short to avoid new warnings.

## Follow-up
- The remaining 84 warnings mostly come from legacy guard functions that cannot be eliminated without larger refactors. It may be worth discussing with maintainers whether they are comfortable relaxing the complexity rule (per-file overrides?).
