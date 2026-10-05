## Fake Firestore TSDoc cleanup

- **Unexpected snag**: Removing `@ts-nocheck` exposed 66 diagnostics, mostly because internal fake Firestore classes and operations were typed as `unknown` despite having stable shapes.
- **Diagnosis + fix**: Added explicit query, write-operation, reference, snapshot, and transaction contracts. Narrowed plain objects before patching and kept dynamic Firestore payloads as `unknown` at the data boundary.
- **Evidence**: `npm run tsdoc:check -- --pretty false`, focused ESLint, and `git diff --check` pass with the pragma removed.
- **Next-time guidance**: Give in-memory adapter classes concrete local contracts, and preserve `unknown` only for external document values that are validated before use.
