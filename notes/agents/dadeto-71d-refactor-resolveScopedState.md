## dadeto-71d: Refactor resolveScopedState

- **Unexpected:** The inline `eslint complexity` override was still required because the function checked both `temporary` and the inner `CYBE1` scope in one body, so I split the logic into a guard and a small helper rather than keeping multiple branches in the same function.
- **Work:** `resolveScopedState` now does a single early return when no `temporary` bucket exists, while the new `resolveTemporaryScope` helper handles the `CYBE1` fallback with vanilla nullish coalescing, letting each function stay under the default complexity limit.
- **Tests:** `npm run lint` (existing warnings remain in `fishingGame.js`, `get.js`, `render-variant-core.js`, `submit-new-page-core.js`, and `commonCore.js`), `npm test`.
