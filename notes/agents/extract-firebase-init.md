# Agent Notes - Extract Firebase Init

- Challenge: Needed to restructure `ensureFirebaseApp` without altering behavior when duplicate app errors occur.
- Resolution: Introduced a dedicated helper to wrap the initialization call so the existing try/catch logic is preserved and reusable.
