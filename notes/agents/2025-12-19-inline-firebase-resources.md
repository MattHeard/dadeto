# Inline Firebase resources helpers

- Removed the `createFirebaseResources` helper from the generate-stats and assign-moderation job cores.
- Ensured the Cloud Function entrypoints perform the Firebase initialization directly.
- Updated tests to exercise the new exports and keep coverage high.
