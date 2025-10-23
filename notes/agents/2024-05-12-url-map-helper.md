# URL Map helper extraction

## Challenges
- Needed to ensure the extracted helper remained defensive when `process.env` is undefined during testing.

## Resolutions
- Added a guard in the helper to fall back to the default map whenever the provided environment object is missing or not an object.
