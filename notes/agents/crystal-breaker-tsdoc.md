# Crystal Breaker JSDoc typing

- Unexpected hurdle: removing the file pragma exposed cascading errors because the simulation helpers used broad `object` annotations and inferred state types recursively.
- Diagnosis path: ran the project JSDoc type check and grouped the failures around persisted state, normalized input, and mutable simulation records.
- Chosen fix: added explicit contracts for game state, keyboard/gamepad input, paddle, orb, and crystals; narrowed persisted records before reading fields; and made helper return types explicit.
- Evidence: `npm run tsdoc:check -- --pretty false`, `npx eslint src/core/browser/toys/2026-06-28/crystalBreaker.js`, and `git diff --check` pass.
- Next-time guidance: define the mutable simulation state shape first, then make every normalizer return a member of that shape instead of using circular `ReturnType` references.
