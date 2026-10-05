# Solar Paddle JSDoc typing

- Unexpected hurdle: removing the file pragma exposed an untyped storage callback and input events, plus a state contract that omitted the generated layout seed.
- Diagnosis path: ran the project `tsdoc:check`, then narrowed persisted values and event payloads at their boundaries while preserving the existing simulation flow.
- Chosen fix: documented the state and seed option shapes, typed the storage accessor and panel construction, and guarded unknown persisted and input values.
- Evidence: `npm run tsdoc:check -- --pretty false`, `npx eslint src/core/browser/toys/2026-06-28/solarPaddle.js`, and `git diff --check` pass.
- Next-time guidance: for toy modules, derive the state contract from both the persisted shape and seed constructor so newly required fields are added consistently.
