## Firebase initialization state refactor

- **Challenge:** Needed to ensure moving the initialization flag into the factory did not break the existing reset hooks used by tests.
- **Resolution:** Introduced a closure-scoped `initialized` variable inside `createFirebaseInitialization` while keeping the external reset handler wired to the factory's `reset` method.
