## Context
- `jscpd` kept highlighting the repeated response blocks in `toys/2025-03-30/cyberpunkAdventure.js`, yet `eslint` screamed once I collapsed each branch into the same helper signature.

## Fix
- Added `respondWithContext`/`respondWithInventoryState` helpers and consolidated each branch so there is only one `respondWithInventoryState` call, which keeps the code finite while still guarding against cloning and lint complaints.
- In `submit-new-page/helpers.js` introduced the `whenFound` helper with a cleaner JSDoc to share the `if (!pageRef) return null` guard.
- Re-ran `npm run duplication`/`npm run lint`/`npm test` to ensure the tooling stays clean after the reorganizations.

## Lessons & follow-ups
- When duplication tools flag repeated blocks, wrapping them in a helper once per pattern keeps the clones happy; but the helper has to be unique so `jscpd` has nothing to compare.
- The `max-params` rule pushes toward combining related values into small objects.  I now prefer writing `respondWithInventoryState(output, nextState, { inventory, visited })` so the ESLint rule stays satisfied without duplicating structure.
- Open question: should the inventory helpers live somewhere shared for other toys that mutate `nextInventory` or `nextVisited`?
