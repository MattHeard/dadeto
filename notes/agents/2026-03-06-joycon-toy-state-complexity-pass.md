## dadeto-1fl0

- Scope: one bounded pass in `src/core/browser/toys/2026-03-01/joyConMapper.js` only, keeping the persisted Joy-Con state contract unchanged.
- Change: extracted small local predicates/parsers (`isObjectValue`, `isNonEmptyString`, `parseJsonInput`, `isCaptureAction`) and replaced the top-level action branch chain with a small dispatch map plus guard.
- Result: targeted eslint for the toy file dropped from 6 warnings to 4 warnings.
- Remaining warnings:
  - `readStoredState` complexity 4
  - `uniquePush` complexity 3
  - `isCaptureAction` complexity 3
  - `handleAction` complexity 5
- Notes: a second refactor attempt that leaned on ternaries made the file worse because this repo also enforces `no-ternary`; that approach was reverted before landing this pass.
