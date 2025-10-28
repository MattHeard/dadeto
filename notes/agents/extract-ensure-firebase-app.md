# Extract ensureFirebaseApp factory

- Challenge: Needed to avoid module-scoped mutable state while keeping existing API for `ensureFirebaseApp` consumers.
- Resolution: Wrapped the initialization guard in `createEnsureFirebaseApp`, returning the closure that maintains the guard without leaking extra state.
