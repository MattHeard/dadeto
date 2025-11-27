Moving the memoized sign-out handler factory out of `src/browser/googleAuth.js` and into `src/core/browser/admin-core.js` keeps the utility with the rest of the admin helpers, which were already the only consumers of the underlying `createSignOut`. The change felt straightforward until I remembered that the browser entrypoint re-exports the core helpers, so the public-facing module still needed to pull the factory from `./admin-core.js` to keep `signOut()` wired up for existing callers.

Lessons:

- When extracting helpers, double-check what re-exports already exist so the surface API doesn’t break (the `src/browser/admin-core.js` proxy meant nothing else had to change).
- Run the full `npm test` suite after touching shared core logic so wider coverage catches any surprises right away.

Open question: Should the memoized handler eventually live in a shared utility module if more sign-in flows need the same caching pattern?
