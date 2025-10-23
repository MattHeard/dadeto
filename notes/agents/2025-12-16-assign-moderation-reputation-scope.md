# Assign Moderation Reputation Scope Helper

- **Challenge:** Needed to reuse the reputation-specific filtering when selecting moderation variants without duplicating inline logic.
- **Resolution:** Extracted a dedicated `createReputationScopedQuery` helper that accepts the reputation flag and base variants query, returning the appropriately filtered query for downstream ordering.
