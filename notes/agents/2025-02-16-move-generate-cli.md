# Move generate CLI into build folder

## Challenges
- Needed to update every reference to the CLI entry point so the script would still run after relocating it.

## Resolutions
- Searched the repository for the old `src/scripts/generate.js` path, moved the file into `src/build/`, and updated documentation and package scripts to point to the new location.
