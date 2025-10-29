# Cloud function dependency rewriting

- Encountered Terraform deployment failures because several Cloud Function bundles
  imported shared modules using relative paths that escaped the packaged
  directory (for example `../process-new-page/process-new-page-core.js`).
- Updated the `src/build/copy-cloud.js` script to copy the required dependency
  files into each function directory and rewrite the problematic imports to use
  sibling paths so the deployed bundles can resolve their modules at runtime.
