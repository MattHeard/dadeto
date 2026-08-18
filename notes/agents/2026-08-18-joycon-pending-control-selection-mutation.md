# JoyCon pending-control selection mutation slice

- Unexpected hurdle: the selector’s broad scan generated seven mutants and was too slow for reliable completion.
- Diagnosis path: added a direct truth table for after-index, equal-index, before-index, and mapped-control cases, then verified the expression range.
- Chosen fix: asserted the selector’s complete behavioral boundary through `isPendingControlAfterIndex`.
- Evidence: the narrowed verification scan killed all 6 mutants; focused Jest, targeted ESLint, and diff checks passed.
- Next-time guidance: use truth-table tests when a compound boolean combines ordering and pending-state predicates.
