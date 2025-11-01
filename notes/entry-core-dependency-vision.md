# Entry/Core Dependency Injection Vision

## Architectural Goals
- Every deployment surface (Cloud Functions, CDN-hosted pages, admin tooling) exposes a single entry module that gathers third-party dependencies and hands them to a pure `*-core.js` module.
- Core modules live alongside their entry points, export factories or handlers, and stay side-effect free by depending only on injected bundles.
- Dependency containers (`gcf`, `browser`, etc.) are the sanctioned gateway to Firebase, Express, DOM APIs, and other mutable services; prefer factories so core logic decides when environments are realized.

## Completed Work
- Cloud Functions now follow the bridge/core split. Example: `src/cloud/get-moderation-variant/index.js` imports its Firebase + Express wiring from `get-moderation-variant-gcf.js` and delegates behavior to `get-moderation-variant-core.js`.
- The cloud copy pipeline (`src/build/copy-cloud.js`) packages both bridge and core modules into the Terraform build artifacts so deployments stay in sync with source.
- Supporting utilities such as `src/browser/loadStaticConfig.js` already inject their external dependencies rather than importing globals, and data controllers accept dependency bundles.
- Browser entry modules now consume core helpers through sibling bridge shims (for example `src/browser/audio-controls.js` and `src/browser/data.js`), keeping adapter imports within the browser surface.

## Outstanding Work
- Formalize dedicated `*-browser.js` entry modules (e.g. wrap `src/browser/main.js`) so HTML surfaces load only the bridge while core code remains decoupled from DOM bootstrapping.
- Define shared dependency bundle contracts (for example via JSDoc typedefs in `src/core/types.js`) so core modules consume consistent shapes across browser and cloud surfaces.
- Refactor remaining core modules to remove direct global imports (`fetch`, `document`, etc.) in favor of injected bundles, then add lint/codemod enforcement to guard the boundary.
- Update developer documentation (`README.md`, `CLAUDE.md`, onboarding notes) once the bridge naming and bundle contracts settle.

## Immediate Next Steps
1. Catalogue the dependencies each browser entry currently wires up and sketch the corresponding bridge module structure.
2. Prototype one page (e.g. the main blog entry) using a `*-browser.js` bridge and confirm generated bundles keep working.
3. Draft shared typedefs and circulate them with maintainers before rolling the refactor across the rest of the browser code.
4. Plan lint enforcement (custom ESLint rule or codemod) after the initial bridge rollout to prevent regressions.
