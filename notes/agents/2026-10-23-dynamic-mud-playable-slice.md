# Dynamic MUD playable known-command slice

- Unexpected hurdle: the first full check found a JSDoc warning, an implicit event type, and a duplicate fragment in the new command adapter; scoped coverage also showed untested failure and state-display branches.
- Diagnosis: the game duplicated DSL object shapes and the page test only exercised one successful submit. The implementation had additional boundary states not represented in tests.
- Chosen fix: extract small DSL program/state helpers, inject the interpreter and initial graph at the trusted controller seam for deterministic branch tests, and exercise unknown input, rejected transactions, incomplete scenes, and post-gate state.
- Evidence: the focused suites pass 15 tests; scoped coverage covers all statements, branches, functions, and lines in both new core modules; jscpd reports zero clones; `npm run build` emits `/dynamic-mud/`; `npm run check` passes 10/10 gates across six impact shards (7,505 tests); manuals validation passes for 82 toys.
- Next-time guidance: keep novel-command generation separate from the safe DSL execution boundary. Do not enable or call the billed OpenAI proxy until its default-off configuration and dedicated funded identity are reviewed.
