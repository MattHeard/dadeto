# Format path helper refactor

## Challenges
- Identifying duplicated logic for path formatting that existed in both `src/core/copy.js` and `src/core/cloud/copy.js` without introducing circular dependencies.

## Resolutions
- Introduced a shared helper (`formatPathRelativeToProject`) in `src/core/copy.js` and reused it inside the cloud copy helpers to keep behaviour identical.
