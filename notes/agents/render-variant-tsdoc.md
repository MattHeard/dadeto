## Render variant TSDoc cleanup

- **Unexpected snag**: Removing the module pragma reveals 69 diagnostics spread across Firestore reference, snapshot, storage, and injected-handler contracts.
- **Diagnosis + fix**: The existing `AllowEffects` typedef also pointed to a nonexistent relative path; corrected it to the repository `types/allow-effects.d.ts` location. Restored the pragma while the broader type contracts remain unresolved.
- **Evidence**: With the pragma restored, `npm run tsdoc:check -- --pretty false` validates the workspace; the isolated diagnostic inventory is in `/tmp/render-variant-ts-errors.txt` for this session only.
- **Next-time guidance**: Define local Firestore reference and snapshot shapes first, including `.ref`, `.parent`, and writable operations, then narrow the render/invalidation helpers by contract.
