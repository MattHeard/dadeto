## Observations
- After moving the handler into `browser-core`, the shim under `inputHandlers/dendritePage.js` no longer had any clients, so it was safe to delete both the source and generated copies.
- Running `npm run build` ensured no stray copies remain in `public/` and the rest of the assets stay in sync with the removal.

## Lessons and follow-ups
- When removing shims, always regenerate the build to drop the corresponding `public/` files; the copy pipeline copies everything in `src/` so stale files can linger otherwise.
- Keep the option to re-add a shim later if a downstream consumer unexpectedly relies on that specific path, but document the removal so future agents understand the change.

## Open questions
- Are there other thin shims in `src/browser` or `src/core/browser` that can be deleted now that their targets are unused?
