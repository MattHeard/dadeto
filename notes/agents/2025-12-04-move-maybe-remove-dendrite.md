## Observations
- `maybeRemoveDendrite` now lives only on the shared `browser-core`, so the shim under `src/browser/inputHandlers/removeElements.js` became dead weight once the toys module imports it directly.
- `npm run build` happily copies the old stub from `src/browser/inputHandlers` even after I deleted it, leaving a stale artifact under `public/browser/inputHandlers/removeElements.js` unless I remove it manually.

## Lessons and follow-ups
- Deleting a shim from `src/browser` is not enough—the copy workflow never prunes old files in `public/`, so remember to check for and drop orphaned copies before committing or extend the workflow to clean them out.
- Moving imports into `browser-core` simplifies the toys module, but keep an eye on any legacy bundles relying on the old path (the shim removal is the same repo-wide break).

## Open questions
- Should we retrofit the copy workflow to prune deleted files, or at least surface a warning when it skips a matchup?
- Do any external integrations still expect `public/browser/inputHandlers/removeElements.js`, or is it safe to permanently drop that path now?
