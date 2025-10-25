# Cloud core bucket refactor

- Challenge: Moving the default bucket name into the shared cloud core module risked breaking the generate-stats copies because the cloud build script previously targeted a non-existent `core.js` file.
- Resolution: Added a thin re-export for the shared core helpers, updated the copy script to ship both the renamed core file and `cloud-core.js` into the generate-stats function directory, and verified the imports still resolve.
