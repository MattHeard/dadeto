# Assign moderation Firestore write boundary

- **Unexpected hurdle:** Narrowing the moderation flow to query-only snapshots exposed that Firestore's SDK snapshot types did not match the small structural snapshot seam used by the tests.
- **Diagnosis:** The production query still returns the same documents; the excess capability came from passing SDK `Firestore` and `DocumentReference` types through core.
- **Fix:** Core now receives a query-only database shape. The cloud adapter constructs `moderators/{uid}` and performs `.set(..., { merge: true })` through an injected writer. Each write invocation receives the fresh `AllowEffects` token, and the token is not captured when the database-bound writer is composed. The snapshot is narrowed at the query boundary.
- **Evidence:** Focused tests are included in `.tmp/npm-check-assign-moderation-write-boundary-final.log`; `npm run check` passed 10/10 gates (0 clones, 0 audit vulnerabilities); `npm run build` passed; targeted ESLint, `npm run tsdoc:check`, `git diff --check`, and the core capability search passed.
- **Next loop:** Continue the source-cloud Allow Effects audit at the next cloud entrypoint; inspect its injected calls and classify effects before editing. Avoid passing write-capable SDK references through core.
