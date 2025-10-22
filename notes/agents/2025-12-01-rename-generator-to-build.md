# Rename generator directory to build

## Challenges
- Renaming `src/generator` to `src/build` touched more than 100 spec files under `test/generator/`; ensuring every import/path string changed without accidentally editing generated reports required careful automated replacements scoped to source and test directories only.
- Several documentation files and scripts referenced the old path. Tracking down nested instructions (especially the long `src/core/toys/AGENTS.md`) took extra time to keep documentation accurate after the rename.

## Resolutions
- Used targeted Perl replacements (`src/generator/` → `src/build/`) followed by manual spot fixes for relative imports (e.g., `src/scripts/generate.js`) to keep module resolution intact.
- Updated docs/notes referencing the generator path and reran `npm test` plus `npm run lint` to confirm the rename did not break the build pipeline.
