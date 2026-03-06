## dadeto-6zf3

- Scope: one bounded cleanup pass in `src/core/browser/toys/2026-03-01/joyConMapper.js` only, with no persisted Joy-Con state contract changes.
- Result: reduced the toy-state file from 4 remaining warnings to 2 remaining warnings.
- Landed shape:
  - extracted a local permanent-data getter helper so stored-state reads are more direct
  - changed skipped-control deduplication to set-based append logic
  - moved capture/known-action resolution behind focused helpers so the top-level action reducer carries less branching
- Remaining warnings:
  - `getStoredValue` complexity 3
  - `handleAction` complexity 3
- Next-time guidance: the final two warnings likely need either accepted local debt or a more opinionated rewrite of the toy-state control flow; further helper extraction alone is producing diminishing returns.
