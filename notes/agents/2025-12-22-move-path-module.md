# Move path utilities into build module

Moved the Node-specific path helper from `src/node/path.js` into `src/build/path.js` and updated callers. Verified relative imports so build and cloud scripts continue resolving directories without depending on the old location.
