# Move createCorsOptions into core

- **Challenge:** The shared core already exposed an internal helper named `createCorsOptions`, so exporting a new implementation from the same module would have collided with the existing helper used by `createSetupCors`.
- **Resolution:** Renamed the internal helper to `buildCorsOptions` and added a new exported `createCorsOptions` that mirrors the cloud entry point logic. Updated the tests to cover the new export and verified the middleware wiring still uses the renamed helper.
