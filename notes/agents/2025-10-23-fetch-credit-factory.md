# Fetch credit factory extraction

**Challenge:** Extracting a factory function without breaking existing consumers required keeping the original `fetchCredit` export available to the handler wiring.

**Resolution:** Introduced a `createFetchCredit` helper that accepts the database instance and then re-exported the bound `fetchCredit` created from it so that downstream modules continue to work unchanged.
