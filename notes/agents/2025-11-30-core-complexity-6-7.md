Surprise: optional chaining and coalescing pushed several simple guards (e.g., pending-name resolution, header lookups) over the complexity limit. Even functions with a single `if` were flagged at 6–7 once they combined `?.`, `??`, or logical `||`. Breaking out the accessors into separate helpers with plain guards was the only reliable way to drop the counts.

Diagnosis: ran `npx eslint src/core --format json` and filtered for complexity ≥ 6 to get a focused list. Iterated on each hotspot and re-ran the same command to confirm the count dropped before moving to the next file. The generate-stats invalidation loop was the trickiest—nested try/catch and response checks inside a `map` arrow inflated complexity until the work was moved into standalone helpers.

What worked: lean, single-purpose helpers (e.g., for guard results, request method enforcement with a sentinel, and header/param extraction) kept each function under the threshold without changing behavior. Throwing sentinel responses and catching them at the boundary helped avoid stacked `if` checks in request handlers. For loops, pull the body into its own function so the mapping arrow stays trivial.

Open question: the codebase still has many complexity-3/4 warnings. If we need to clear more, a shared pattern for “result-or-throw” helpers and response sentinels would keep handlers readable while satisfying the rule.***
