# Duplicate app detection helper extraction

## Challenges
- Needed to preserve the existing duplicate-app detection semantics while moving the logic into a standalone function.

## Resolutions
- Added a small helper that mirrors the previous boolean expression to guarantee behavior stays identical after the refactor.
