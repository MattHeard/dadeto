Admin/data tsdoc fix (2025-12-18)

- The tsdoc run kept rejecting `data.js` because `BlogStateRecord` properties were falling back to `unknown` whenever I made the type reference `Record<string, unknown>` directly; the fix was to make the typedef an intersection (`Record<string, unknown> & {...}`) so the controller helpers could keep the index signature while still describing each field, then align all of the controller method docs with the stronger return types.
- The `fetchAndCacheBlogData` helpers also needed extra guards (the new `getActiveBlogFetch`/`ensureActiveFetchPromise` duo) so the compiler would realize the early-return promise was never `null` without inflating the function complexity.
- Even with those fixes the global `npm run tsdoc:check` is still red because of scores of other modules (input handlers, cloud helpers, etc.); consider splitting the tsdoc project or adding smaller checks for the admin/data bundle before the big sweep.
- Commands run: `npm run lint`, `npm test`, `npm run duplication`, `npm run tsdoc:check`.
