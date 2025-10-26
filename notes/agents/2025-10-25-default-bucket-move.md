# Default bucket constant relocation

- Challenge: Moving the generate stats bucket constant without breaking existing imports required threading the value through shared cloud helpers and keeping the Cloud Functions copy script in sync with the new filenames.
- Resolution: Centralized the default bucket export in `src/core/cloud/cloud-core.js`, added a generate-stats bridge re-export, and updated `src/build/copy-cloud.js` to copy both the core module and shared cloud helpers into the deployment package.
