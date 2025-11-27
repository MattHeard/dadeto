## What surprised me
- ESM module exports in `admin-core`/`token-action` are read-only, so attempts to `jest.spyOn` or mock them failed with assignment errors. I had to avoid spying and instead add an opt-in callback to surface the memoized handlers for testing.
- Jest's default-argument branch tracking was stubborn; calling the helper normally didn't tick the coverage counter, so I added an explicit default-path assertion to make the intent clear.

## How I diagnosed and fixed it
- When spying on `initAdmin`/`createAdminTokenAction` threw, I checked the coverage JSON to see which branches were still red, then looked for other seams. Since the memoized handlers were trapped in a closure, I introduced an optional `onHandlersReady` hook to expose them in tests without changing runtime behavior.
- Branch 73 stayed uncovered even after hitting the helper, so I added a dedicated test exercising the default scope path to guarantee the branch counter incremented.

## Follow-ups
- If we need deeper observability into `initAdminApp` flows again, consider keeping the `onHandlersReady` hook documented, or introduce a small test-only export to surface those handlers without touching the production call sites.
