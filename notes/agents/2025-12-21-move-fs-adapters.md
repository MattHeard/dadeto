# Move FS adapters into build package

- **Challenge:** Ensuring the filesystem helpers stayed accessible to both the build copy workflow and the cloud copy-to-infra script after relocating the module.
- **Resolution:** Moved `fs.js` into `src/build`, then updated the import paths in `src/build/copy.js` and `src/cloud/copy-to-infra.js` so each consumer points at the new location.
