# JoyCon axis-capture guard mutation slice

- Unexpected hurdle: none; existing capture tests covered both missing-input branches and the valid path.
- Diagnosis path: a bounded scan over `joyConMapper.js:1136-1142` exercised the guard and delegated capture path.
- Chosen fix: no production or test change was needed; existing behavioral assertions were sufficient.
- Evidence: Stryker killed all 7/7 mutants; the focused Jest suite has 42 passing tests; targeted ESLint and diff checks pass.
- Next-time guidance: preserve direct missing-input tests when a guard delegates to a more complex capture finder.
