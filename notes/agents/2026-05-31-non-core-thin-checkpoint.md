# Non-core Thin Checkpoint

## Hurdle
The mutation scan script started as a deleted file and then came back over the size limit, so the non-core gate stayed flat until I compressed it much harder. The Notion launcher wrapper also needed an exact `export { handle }` shape before the policy would stop flagging it.

## Diagnosis
I verified the live counts with `src/core/local/non-core-thin/status.js` instead of trusting a stale gate run. That made it obvious that the mutation script was the only size violation I had actually eliminated, and that the launcher issue was a wrapper-pattern problem rather than a size problem.

## Fix
I compressed `src/scripts/find-surviving-mutant.js` down below the 50-line threshold and adjusted `src/local/notion-codex/launcher.js` to export the `handle` symbol directly while preserving the existing launcher API.

## Next Time
If the wrapper checker complains, check the exact export form it expects before trying a broader refactor. For size work, confirm the current count with the status helper first so a changed file doesn’t get mistaken for a net win.
