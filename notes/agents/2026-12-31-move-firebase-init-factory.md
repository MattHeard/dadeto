# Move Firebase init factory

- **Challenge:** Moving the Firebase initialization factory into the shared core module caused Jest to surface a lingering expectation that the Cloud get-api-key-credit createDb helper re-export the core implementation. The test began failing once module graphs changed.
- **Resolution:** Swapped the Cloud entry point to re-export the core createDb helper so both imports reference the same function object, satisfying the re-export assertion while keeping functionality identical.
