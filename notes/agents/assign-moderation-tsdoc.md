## Assign moderation TSDoc cleanup

- **Unexpected snag**: Removing the file-level `@ts-nocheck` exposed vague callback types and Firestore ambient declarations that omit `ref` and `set` members.
- **Diagnosis + fix**: Tightened injected query, candidate fetch, and selector contracts to match their actual call sites. Preserved the snapshot-fetching factory behavior, and used narrow structural casts only where the Firebase declarations are incomplete.
- **Evidence**: `npm run tsdoc:check -- --pretty false`, focused ESLint, and `git diff --check` pass.
- **Next-time guidance**: Inspect callers and tests before narrowing injected function types; similarly named query helpers in this module have different contracts.
