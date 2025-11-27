While wiring the contents/stats/variant auth helpers it was surprising to see them rely on helper exports from `src/browser/googleAuth.js` that were not part of the current surface API; those helpers only existed transitively via the recent refactor (and the only instance of `isAdmin` came from a wrapper that created the module). I double-checked the core helpers and realized we could consume them directly from `src/core/browser/browser-core.js` and `src/core/browser/admin-core.js` instead of expanding `googleAuth.js`’s public surface.

I ended up importing `getIdToken` from the browser core and `isAdminWithDeps` from the admin core inside each module, keeping their logic close to their DOM wiring. This avoids duplicating the helper definitions and keeps `googleAuth.js` focused on sign-in/sign-out only.

Next time I might look for an existing shared helper (e.g., a reusable `isAdmin()` wrapper) before copying the dependency wiring into multiple files; if the duplication proves painful we could expose a convenience helper in `src/browser/admin-core.js` instead of inventing a new module here.

Open question: should we create a shared `auth-helpers.js` for `isAdmin`/`getIdToken` consumers so we don’t repeat the dependency wiring when more UI entry points need this data?
