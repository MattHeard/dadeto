## Render variant TSDoc cleanup

- **Unexpected snag**: Removing the module pragma exposed 69 diagnostics spread across Firestore reference, snapshot, storage, and injected-handler contracts. The existing `AllowEffects` typedef also pointed to a nonexistent relative path.
- **Diagnosis + fix**: Corrected the typedef path and described local Firestore references, snapshots, storage, renderer callbacks, and visibility values in JSDoc. Added guards where optional snapshots or references could otherwise be dereferenced.
- **Evidence**: `npm run tsdoc:check -- --pretty false`, focused ESLint, and `git diff --check` pass with the pragma removed.
- **Next-time guidance**: Define local Firestore reference and snapshot shapes first, including `.ref`, `.parent`, and writable operations, then type the renderer around those contracts.
