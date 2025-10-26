## Assign moderation environment inlining

- Challenge: Removing the shared `defaultEnvironment` constant risked breaking the logic that detects custom dependency injection in `getFirestoreInstance`.
- Resolution: Default the destructured `environment` to `undefined`, lazily fetch `getEnvironmentVariables()` when it isn't provided, and switch the custom dependency check to look for an explicit override instead of comparing object identity.
