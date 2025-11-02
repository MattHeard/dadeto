# Notes on moving core state helpers

- I initially assumed the helpers were only consumed within core modules, but the search revealed imports tucked away in the `src/core/browser/toys` utilities. Without updating those paths the build would have failed, so a comprehensive `rg '../state.js'` sweep proved essential.
- Removing `src/core/state.js` meant the Jest suite still referenced the old location. Updating the dedicated test to point at `browser-core` provided quick feedback that coverage stayed intact.
- The generated files under `public/` still point to the old module, but those are build artefacts. Leaving them untouched prevents churn—worth remembering when moving shared helpers that have compiled counterparts.

If we migrate more shared helpers later, start by grepping for the old path to avoid missing indirect consumers and always confirm whether `public/` files need regeneration or should remain as-is.
