# Core and Adapter Restructure Plan

## Current State Overview
- The `src/generator` tree mixes pure string-building utilities (`html.js`, `head.js`, `full-width.js`, etc.) with orchestration logic in `generator.js`; these operate on plain data and return markup without touching the filesystem or browser APIs.
- Environment-facing behaviors live in sibling folders: browser bootstrapping and DOM helpers (`src/browser`), UI input handlers/presenters (`src/inputHandlers`, `src/presenters`), Firebase Cloud Functions (`src/cloud`), and Node-based build scripts (`src/scripts/generate.js`, `src/generator/copy.js`, `src/cloud/copy-to-infra.js`).
- Shared utilities (`src/utils`) and constants (`src/constants`) are pure helpers already, while tests mirror the current layout and import modules by their existing paths.
- Build automation assumes today’s folder names: Netlify publishes `public/`, `npm run build:browser` copies assets from `src` before generating HTML, and `npm run build:cloud` mirrors Cloud Function sources into `infra` for Google Cloud deployments.

## Target Structure
```
src/
  core/
    blog/…            // generator templates, blog data mappers
    state/…           // environment-agnostic state helpers (currently in browser/data.js)
    toys/…            // pure toy functions that consume injected env maps
    utils/…           // existing utils and constants
  adapters/
    browser/…         // DOM, window, fetch, audio setup, presenters, input handlers
    cloud/…           // Firebase/Express functions
    scripts/…         // Node CLI + copy pipelines
  environments/
    netlify/…         // config glue if needed
    gcp/…             // infra-specific wiring or keep under adapters/cloud
```

This split makes `core` explicitly dependency-free, while adapters handle DOM, Node, Firebase, or HTTP concerns.

## Core Extraction Candidates
- Move every pure template helper from `src/generator` (except `copy.js`) into `src/core/blog` so they can be consumed from multiple environments while guaranteeing zero third-party dependencies.
- Relocate `src/utils` and `src/constants` into `src/core/utils` and `src/core/constants` respectively; these modules already satisfy the purity requirement and underpin both browser and cloud code paths.
- Extract the deterministic portions of `src/browser/data.js`—such as `deepMerge`, blog-state sanitizers, and Base64 helpers—into `src/core/state/blogData`. Keep the `fetchAndCacheBlogData` wrapper in an adapter module so the core layer never references `fetch` or logging side effects.
- Audit the toys. Most are simple transforms that rely solely on the injected environment map, so you can house them under `src/core/toys` and treat the existing DOM loader as the adapter that imports them.

## Adapter Boundaries
- Consolidate DOM-oriented modules (`src/browser`, `src/inputHandlers`, `src/presenters`) under `src/adapters/browser`. They manipulate the document, window, and localStorage, which are browser-specific concerns unsuitable for the core layer.
- Keep Node scripts such as `src/scripts/generate.js` and `src/generator/copy.js` grouped with the adapter-focused build tools (e.g., under `src/adapters/scripts`). They interact with the filesystem, Prettier, and process APIs to prepare Netlify artifacts, so they naturally belong to the build adapter layer.
- Relocate Firebase/Express handlers under `src/adapters/cloud` and introduce thin entry files that import pure business rules from `src/core`. That allows you to isolate logic for validation, rate limiting, or moderation state changes in the core while leaving the HTTP and Firestore wiring inside the adapter.
- Move `src/browser/admin.js` into `src/adapters/browser/admin` (or similar) to highlight its external dependencies on hosted Firebase scripts and Cloud Function endpoints.

## Dependency Injection Strategy
- Formalize “env maps” at the adapter boundary. `browser/main.js` already builds a map with functions like `getRandomNumber`, `setLocalTemporaryData`, and `getData`; treat this as an adapter responsibility and feed it into core functions that expect injected dependencies. Consider defining shared JSDoc typedefs in `src/core/interfaces` so both toys and adapters agree on the available symbols.
- For cloud handlers, extract request parsing and validation into pure functions that accept `(payload, deps)` where `deps` includes Firestore mutators or ID generators. Adapters like `submit-new-story` would assemble `deps` from Firebase SDKs and call the core function, keeping tests deterministic and ensuring core code stays third-party free.
- For build scripts, surface explicit entry points—e.g., expose `renderBlog(blog, deps)` from the core, and have `generate.js` inject filesystem writers and formatters. This also makes unit tests easier to write for the pure generation path.

## Build and Deployment Updates
- Update `package.json` scripts to point to the relocated adapter files (e.g., `node src/adapters/scripts/copy.js`) and ensure `npm run build:browser` still copies toys, presenters, and any other browser bundles into `public/` for Netlify.
- Adjust `src/adapters/scripts/copy.js` (formerly `src/generator/copy.js`) to read from the new `src/core/toys`, `src/adapters/browser`, and `src/core/utils` directories when cloning assets into `public/`. Similarly, tweak `src/adapters/cloud/copy-to-infra.js` to reflect the new `src/adapters/cloud` path before syncing into `infra/cloud-functions`. Both scripts already enumerate directories explicitly, so you’ll simply swap the base paths once the folders move.
- Netlify will continue publishing `public/`, so confirm that any new adapter bundle still outputs there. Keep `netlify.toml` pointing at the same directory unless you introduce a different build artifact layout.
- Google Cloud deployment relies on the replicated sources in `infra/`. After moving files, double-check `infra` references to ensure they import the updated locations, and verify `npm run build:cloud` copies everything necessary for Cloud Functions and any shared adapter code.

## Testing and Coverage Considerations
- Once the core layer is isolated, enforce 100% branch coverage on its modules by extending the existing Jest suites (`test/core/...`). Core code should be fully testable without mocks beyond dependency injection, while adapter tests can focus on integration seams and may tolerate lower coverage if necessary.
- Browser adapters that still need DOM testing can continue using `jest-environment-jsdom`, but keep those tests in `test/adapters/browser/...` to make the boundary explicit.
- For cloud adapters, prefer lightweight contract tests that exercise request/response translation while mocking injected Firebase dependencies. The core logic under test stays pure and remains subject to the 100% branch coverage guarantee.

## Incremental Deployment Steps
1. **Lay down the new folder skeleton** (`src/core`, `src/adapters/browser`, `src/adapters/cloud`, `src/adapters/scripts`) without moving files yet. Update lint/test paths to recognize the new directories.
2. **Migrate pure modules**: move generator helpers, utils, constants, and deterministic portions of `browser/data.js` into `src/core`. Update imports in both code and tests to the new paths.
3. **Refactor adapters**: relocate browser, input handler, presenter, and cloud modules into `src/adapters/...`. Introduce thin adapter entry points that import the newly relocated core modules.
4. **Revise build scripts**: rename `src/generator/copy.js` to `src/adapters/scripts/copy.js` and adjust directory constants so Netlify assets still land in `public/`. Do the same for `copy-to-infra.js` with the new cloud paths.
5. **Update entry scripts**: change `generate.js` to import from the core generator location and keep all filesystem/Prettier usage inside the script adapter.
6. **Realign tests**: mirror the new structure under `test/core` and `test/adapters`. Update Jest config if it relies on module name patterns to collect coverage.
7. **Run smoke builds**: execute `npm run build:browser` and `npm run build:cloud` to confirm the copy routines still populate Netlify’s `public/` and GCP’s `infra/` trees correctly. Follow up with `npm test` to verify branch coverage remains at 100%.
8. **Incrementally clean dependencies**: as modules move into `core`, eliminate any lingering third-party imports. Replace direct `fetch` calls inside core helpers with injected functions provided by adapters.
9. **Document the contract**: add README notes describing which directories are core vs. adapters and how dependency injection works, so future contributors maintain the separation.

