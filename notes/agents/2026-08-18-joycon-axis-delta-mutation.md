# JoyCon axis-delta mutation slice

- Unexpected hurdle: none; existing direction-aware delta assertions covered both branches.
- Diagnosis path: a bounded scan over `joyConMapper.js:1106-1112` exercised the positive and negative sign paths.
- Chosen fix: no production or test change was needed; the existing behavioral assertions were sufficient.
- Evidence: Stryker killed all 7/7 mutants; the focused Jest suite has 41 passing tests; targeted ESLint and diff checks pass.
- Next-time guidance: scan small sign-conversion helpers independently before adding redundant assertions.
