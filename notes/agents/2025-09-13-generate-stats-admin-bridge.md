# Admin UID re-export bridge

## Challenges
- Needed to centralize the generate stats admin config without introducing brittle relative imports throughout tests and cloud code.

## Resolutions
- Added a local re-export shim so the core module can rely on a stable sibling path while still sourcing the canonical admin configuration.
