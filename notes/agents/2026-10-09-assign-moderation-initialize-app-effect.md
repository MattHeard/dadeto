# Assign moderation Firebase initialization effect

- Unexpected hurdle: the cloud wrapper stored the Promise returned by the async core entrypoint and immediately read `handle` and `testing` from it. Moving initialization behind an awaited effect boundary made that existing mismatch visible.
- Diagnosis: `firebase-admin/app.initializeApp` changes global SDK state, so it is a startup command effect. The two remaining reviewed imports, `resolveFirestoreEnvironment` and `shouldUseCustomFirestoreDependencies`, only select configuration and compare overrides; they do not perform command effects.
- Chosen fix: added a cloud-only adapter whose first argument is `AllowEffects`; core obtains a fresh startup capability and forwards it with the initializer. Core retains duplicate-app handling. The cloud wrapper now awaits the entrypoint before exporting its registered handler.
- Next-time guidance: keep startup capabilities scoped to the composition callback and continue auditing imported helpers based on their actual implementations. Next in the current review is any remaining direct command in the assign-moderation-job call tree, then lexicographic `src/cloud` entries.
