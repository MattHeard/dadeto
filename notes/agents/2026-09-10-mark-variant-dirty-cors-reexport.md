# Mark variant dirty CORS re-export

## Challenges
- Needed to share the main CORS configuration with the mark-variant-dirty function without relying on a parent-relative import path that breaks module encapsulation.

## Resolutions
- Added a local re-export shim inside `src/cloud/mark-variant-dirty/` so the function can import `getAllowedOrigins` via a sibling module path.
- Updated the function entry point to pull from the shim, allowing future local overrides if necessary.
