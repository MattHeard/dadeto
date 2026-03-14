# JoyCon mapper payload/row state loop

- Unexpected hurdle: The lint rules want cyclomatic complexity ≤2 per function plus avoid ternaries, so literally lowering branching required scratching and rebuilding the helper cluster instead of just tweaking one condition.
- Diagnosis path: Reviewed `joyConMapper.js`, spotted the payload builder and row-state helpers as the next complexity cluster flagged by ESLint, then tracked how those functions were composed and how they contributed to the warnings.
- Chosen fix: Pulled payload composition into an `attachCurrentControlKey` helper to keep `buildPayload` branch-free, then broke row-state derivation into `getRowStateFromStored`, `getActiveOrOptionalRowState`, and `isActiveRow` so each helper stays within the complexity budget while still returning the right class and value text.
- Next-time guidance: If similar complexity warnings pop up, split the logic into tiny helpers that either short-circuit or return constants instead of piling `if/else` logic, and confirm the lint report again before closing the bead.
