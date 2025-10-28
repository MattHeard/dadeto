# Entry/Core Dependency Injection Vision

## Architectural Goals
- Every deployment surface (Cloud Functions, CDN-hosted pages, admin tooling) should expose a single entry module that imports third-party or platform-specific dependencies and passes them into a pure core module.
- Core modules live alongside their entry points, export a single factory or handler function, and depend only on the injected environment so they remain unit-testable and context-agnostic.
- Dependency "bundles" such as `gcf` objects or `browser` maps are the only approved way for core code to talk to Firebase, Express, DOM APIs, or other side-effectful services.
- Whenever practical, pass dependency *factories* (e.g., `gcf`, `browser`) so the core module controls when the environment is materialized and can defer heavy setup until it is needed.

## Current Progress
- **Cloud Functions** already conform to the pattern. For example, `src/cloud/get-moderation-variant/index.js` imports Google Cloud dependencies from `get-moderation-variant-gcf.js`, prepares the Firebase + Express environment, and then delegates all logic to factories defined in `get-moderation-variant-core.js`.
- The build pipeline copies both bridge and core modules for each function (see `src/build/copy-cloud.js`) so the deployment artifacts stay aligned with source structure.
- **Browser entry points** (e.g. `src/browser/main.js`) have the right separation of concerns conceptually—runtime wiring is handled in the entry file, while behavior is sourced from `src/core/browser/*` modules such as `data.js`, `audio-controls.js`, and `beta.js`.

## High-Level Changes to Pursue
1. **Formalize Browser Bridges**
   - Introduce explicit `*-browser.js` bridge files that gather DOM, storage, and fetch dependencies before invoking a `*-core.js` module.
   - Update existing pages (`public/blog/index.html`, Dendrite static pages) so each script tag points at the new bridge file instead of directly importing scattered helpers.
2. **Unify Dependency Containers**
   - Define a shared contract for bridge objects (`gcf`, `browser`) with documented shape via JSDoc typedefs in `src/core/types.js`.
   - Replace ad-hoc imports inside core modules with injected utilities. For example, refactor `src/core/browser/data.js` to accept `{ fetch, loggers, storage }` rather than importing `fetch` or `localStorage` globally.
3. **Strengthen Testing Hooks**
   - Provide factory exports from each core module that accept a dependency bundle and return the operational handler. Example: `export function createHandleGetModerationVariant({ gcf }) { ... }`.
   - Ensure Jest suites instantiate these factories with mock bundles to keep tests isolated from Firebase/DOM.

## Concrete Examples

```js
// src/cloud/example-function/index.js
import { gcf } from './example-function-gcf.js';
import { registerExampleFunction } from './example-function-core.js';

export const exampleFunction = registerExampleFunction(gcf);
```

```js
// src/cloud/example-function-core.js
export function registerExampleFunction(gcf) {
  const { functions, express } = gcf();
  const app = express();

  app.get('/', (req, res) => {
    res.send('hello from the injected world');
  });

  return functions.https.onRequest(app);
}
```

```js
// src/browser/example-page-browser.js
import { browser } from './browser-dependencies.js';
import { createExamplePage } from '../core/browser/example-page-core.js';

createExamplePage(browser);
```

```js
// src/core/browser/example-page-core.js
export function createExamplePage(browser) {
  const { dom, fetch, storage } = browser();

  // use injected dependencies instead of globals
  fetch('/api/example')
    .then((response) => response.json())
    .then((data) => {
      storage.setItem('example-data', JSON.stringify(data));
      dom.querySelector('#example').textContent = data.message;
    });
}
```

```js
// src/browser/browser-dependencies.js
export function browser() {
  return {
    dom: document,
    fetch,
    storage: window.localStorage,
  };
}
```

## Next Steps
- Audit every existing entry file under `src/cloud/*/index.js` and `src/browser/*.js` to document the dependencies they pass so the `*-core.js` layer can expose a consistent signature.
- Update developer docs (e.g. `README.md`, `CLAUDE.md`) once the bridge/core naming convention is standardized.
- Add lint rules or codemods that flag direct third-party imports inside `src/core/**` to enforce dependency injection over time.
