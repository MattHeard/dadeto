# Environment helper extraction

## Challenges
- Ensuring the environment accessor remained testable after moving it out of the entrypoint without introducing circular imports.

## Resolutions
- Added `getEnvironmentVariables` to `gcf.js` alongside other Firebase helpers and updated the entrypoint to consume it directly.
