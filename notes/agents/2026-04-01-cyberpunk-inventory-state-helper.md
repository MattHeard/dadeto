## Cyberpunk inventory state helper

- **Context:** `jscpd` flagged repeated object-literal shape in `src/core/browser/toys/2025-03-30/cyberpunkAdventure.js` where the adventure branches were passing the same inventory state bundle twice.
- **Fix:** Extracted `createInventoryState(inventory, visited)` and reused it from the trade and stealth handlers, which keeps the state bundle construction in one place without changing behavior.
- **Follow-up:** Keep scanning the `17`-token frontier for the next unrelated clone group; the current slice is stable and covered by the existing adventure tests.

**Testing**
1. `npm run duplication`
2. `npm run lint`
3. `npm test`
