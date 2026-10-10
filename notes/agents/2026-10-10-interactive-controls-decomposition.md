# Interactive controls decomposition

- Unexpected hurdle: the effective-arity rule expands the three fields read from `elements`, even though the exported function's public signature is already three arguments.
- Diagnosis path: inspected the existing focused tests and DOM presenter path to preserve the sequence of enabling controls, clearing/rendering the ready message, then removing the warning state.
- Chosen fix: read element properties directly and delegate control enabling and ready-state rendering to named helpers. Added an ordered-operation regression for the observable DOM sequence.
- Next-time guidance: keep public calls and DOM ordering intact while splitting UI responsibilities. `src/core/browser/toys.js` now has 15 remaining findings; the next reported function is `migrateRowIfValid` (effective arity 5). Continue without suppressions.
