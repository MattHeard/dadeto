## Cyberpunk adventure context reuse

- **Unexpected:** `jscpd` highlighted two near-identical blocks inside `src/core/browser/toys/2025-03-30/cyberpunkAdventure.js`—one building the context object for a step and the other passing almost the same fields when calling `processAdventureStep`. Even though only one call site existed, the duplication still surfaced because the object literal and property list appeared twice.
- **Diagnosis:** A single canonical context object was needed. I extracted `createAdventureContext` to build the shared argument bag, then changed `processAdventureStep` to accept that context plus the cleanup helper so the long property list lives in one place. `runAdventure` now reuses the prepared context and simply feeds in `setTemporaryData`. Added explicit `AdventureContext` typedefs/JSDoc so lint stays happy.
- **Next steps:** The remaining duplication groups (`generate-stats`, `toys-core`, `battleshipSolitaireClues`, etc.) can be addressed similarly by harvesting shared helpers or splitting logic.

**Testing**
1. `npm run duplication`
2. `npm run lint`
3. `npm test`
