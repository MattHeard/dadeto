# Move createCorsOriginFromEnvironment helpers into core

## Challenges
- Needed to relocate both the factory and direct helper without breaking the Express initialization flow that depended on local closures.
- Ensuring dependency injection remained explicit while avoiding duplicate logic between the factory and the convenience helper.
- Updating the existing Jest suite to cover the new exports without introducing brittle expectations.

## Resolutions
- Added core exports that accept explicit dependency bags so the Cloud Function entrypoint can compose them while preserving testability.
- Reused the existing `createCreateCorsOrigin` helper inside the new functions to centralize the wiring and prevent duplicated environment lookups.
- Expanded the core test suite with targeted cases that verify both the factory wiring and the direct helper to maintain coverage after the move.
