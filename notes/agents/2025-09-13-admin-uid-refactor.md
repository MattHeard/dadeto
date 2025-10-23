# Admin UID refactor

- **Challenge:** Swapping `createGenerateStatsCore` to read the admin UID from the shared config broke the existing tests because they still injected a fake value.
- **Resolution:** Imported `ADMIN_UID` in the core module/tests, removed the dependency injection, and updated the mocks to rely on the shared constant so authorization logic stayed intact.
