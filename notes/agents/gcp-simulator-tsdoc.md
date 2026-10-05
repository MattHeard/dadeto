# GCP simulator JSDoc typing

- Unexpected hurdle: removing the pragma surfaced type gaps in the simulator plus SDK type mismatches between its fake Firestore and the production factories it composes.
- Diagnosis path: ran the full JSDoc checker, grouped diagnostics by simulator helpers versus factory boundaries, and compared the fake query/document operations with the methods used by the routes.
- Chosen fix: added explicit route, trigger, request, snapshot, and moderation candidate contracts; narrowed persisted unknown values through record readers; added collection `limit()` and document merge-set support to the fake Firestore; and asserted the fake-to-production factory conversions only at the composition boundary.
- Evidence: `npm run tsdoc:check -- --pretty false`, focused ESLint for simulator and fake Firestore, and `git diff --check` pass. `rg -n '@ts-nocheck' src/core` returns no matches.
- Next-time guidance: keep simulator-only SDK conversions at the factory composition point, and keep fake Firestore behavior aligned with the specific operations the simulator invokes.
