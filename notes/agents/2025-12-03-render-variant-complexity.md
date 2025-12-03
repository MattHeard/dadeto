## Render Variant Complexity (2025-12-03)

- **Unexpected:** `render-variant-core.js` had several helpers (ancestor resolution, parent URL lookup, source normalization) that tripped the `complexity` rule even after the previous refactors; the branching came from optional chaining, nullish coalescing, and promise catch blocks.
- **What I did:** I pulled ancestor traversal into `walkReferenceChain`/`getParentRef` so `getAncestorRef` only normalizes the step count, wrapped the parent URL resolver/catcher logic in dedicated helpers, and added `isObjectLike` to make `getNormalizedSource`’s guard a single branch. Each helper now keeps its own logic under the limit while `getAncestorRef`, `resolveParentUrl`, `fetchAndBuildParentUrl`, and `getNormalizedSource` stay simple.
- **Testing:** `npm run lint`, `npm test`.
