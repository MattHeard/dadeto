# Reflection - submit-new-story responder refactor

## What surprised me
- ESLint's `complexity` rule counts optional chaining and boolean operators, so extracting helpers initially increased warnings even though the logic felt simpler.

## How I resolved it
- Reworked the helpers to avoid optional chaining and chained boolean expressions, introduced small lookup tables, and reran lint with stricter thresholds to confirm the resulting complexities.

## Follow-ups
- Consider raising the global complexity thresholds or scheduling time to address the many remaining warnings so future refactors are less noisy.
