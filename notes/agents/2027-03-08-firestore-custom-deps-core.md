# Firestore custom dependency helper relocation

- Moved the `shouldUseCustomFirestoreDependencies` helper into the shared assign moderation core module.
- Ensured the Cloud Function entry point now reuses the shared export instead of maintaining its own copy.
- Verified that the helper remains exposed through the testing surface for downstream suites.
