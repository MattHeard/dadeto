# Object utilities move reflection

- Unexpected: migrating `src/core/objectUtils.js` into `src/core/browser/browser-core.js` required keeping the thin re-export in `objectUtils.js` so `core` consumers and tests did not need to change, which also prevented a circular dependency since browser-core now owns the logic.
- Learned: when collapsing shared helpers into higher-level modules, keep the original entry points as facades to avoid touching every import site; documenting those facades in future refactors will help avoid confusion about where behavior actually lives.
- Next step: ensure the generator/browser entry path re-exports stay in sync with browser-core exports, especially if we add more shared helpers and expect tests to hit them directly.
- Open questions: should we eventually remove the facade file for `src/core/objectUtils.js` once all importers are updated to pin `browser-core.js` directly, or is the convenience more valuable than the extra module indirection?
