# Handler consolidation follow-up

## Challenges
- Removing the dedicated handler module broke the copy-to-infra workflow because the build script still attempted to copy `handler.js` from the core tree.
- Several function entry points and tests imported the handler from its original path, so relocating the implementation required auditing re-export layers to avoid circular references.

## Resolutions
- Replaced the handler copy step with a `core.js` copy in `copy-to-infra.js` so deployments receive the consolidated implementation.
- Updated cloud entrypoints, pass-through modules, and tests to import from the new `core.js` location while keeping a lightweight re-export for compatibility.
