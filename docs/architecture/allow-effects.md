# AllowEffects first-pass contract

Source: [Allow Effects – First Pass Specification](https://app.notion.com/p/matt-heard/Allow-Effects-First-Pass-Specification-3ef700afc301818ab016d5cbe5e8192a), fetched in full on 2026-10-04. Implementation owner: dadeto-feye.

`types/allow-effects.d.ts` exports a nominal JSDoc-visible `AllowEffects` interface with a private unique-symbol brand. Ordinary objects cannot accidentally satisfy it. `src/cloud/allow-effects.js` creates a fresh frozen permission at an external runtime boundary. Its trusted assertion connects the private compile-time brand to a private runtime symbol; application core code must never replicate that assertion or mint tokens.

The shared non-core adapter in `src/adapters/allow-effects.js` exposes `requireAllowEffects(raw)`, which adds a required leading permission while forwarding the raw callable's remaining arguments, caller receiver, return value, and thrown errors unchanged. Its type preserves a single call signature, including optional and rest parameters. TypeScript's `Parameters`/`ReturnType` model does not preserve overloaded signatures or generic per-call relationships; use a specifically typed named wrapper for those APIs. The helper does not mint or retain permissions and is not a runtime authorization check. Browser builds copy `src/adapters/` to `public/adapters/` so browser modules can import the same source helper.

The same module exposes `adaptAllowEffectsBag(raw, classification)`. The classification is an allowlist: `query` methods retain their argument and result contract, `effect` methods require permission first, and nested objects are adapted only when their paths are explicitly classified. The returned object is frozen and has no prototype, so unclassified members and raw effect methods are not reachable through it. It resolves selected methods through data descriptors (including class prototypes), binds each method to its original object, and rejects accessors, selected non-method values, unknown names, and invalid or empty classifications. This first version intentionally does not copy data fields or evaluate dynamic getters. Cloud packaging copies the shared adapter into each function package; local and build code can import the same source module directly.

The local document store now injects a single classified filesystem surface: `readFile` is a query, while `mkdir`, `rm`, and `writeFile` are effects. `src/core/local/documentStore.js` receives only that restricted `fs` bag, and each command forwards its boundary permission to effect methods. The local environment adapts `node:fs/promises` before core construction; core does not receive a parallel raw filesystem alias.

The first classified command is submit-new-story's injected `saveSubmission(allowEffects, id, submission)`. The external `createEffectHttpBoundary` adapter mints a new permission for each HTTP invocation and calls the explicitly effectful internal route; public HTTP/Firebase callers still supply only `req, res`.

Successive real compiler diagnostics revealed the intermediate links: the save helper, submission processor, method dispatch, domain responder, debug responder and internal HTTP adapter. Each invocation owns and explicitly forwards its permission. Method dispatch is direct instead of a token-capturing callback. This chain was recorded after compiler discovery, not prescribed ahead of migration. The cloud build copies the external adapter into the function package and rewrites its import.

All core code is forbidden from importing/re-exporting either cloud or local permission factories, including dynamic import and require. The type-aware `capability/allow-effects` rule covers the submission, render, browser admin/action, billing, moderation, beacon, auth-cache, cloud error-reporting, stats invalidation, and local simulator command modules. It checks actual private-symbol identity, including inferred aliases, unions and mapped types, rather than identifier spelling. A permission reference must belong to a direct parameter of the same invocation frame. Captures, storage, return values, minting calls and forged command arguments are rejected. Compiler source mismatches fail closed. Compiler program construction stays in the external lint configuration, not the core rule. The normal maximum of four parameters is restored.

Browser billing checkout and navigation, moderation assignment and rating, browser error beacon fetch and `sendBeacon`, author UUID cache updates and sign-out cleanup, cloud Error Reporting writes, and generate-stats CDN invalidation each receive permissions from their external browser or cloud runtime boundary. Every injected `fetchFn` in core is permission-aware, including GET requests: a request method does not prove that a request has no side effects. Native fetch closures that are internal to core are not injected fetch functions; external adapters convert native fetch into the permission-aware contract. Storage reads retain ordinary adapters.

The local simulator is a second environment entry point. Its raw core submission route now takes a permission first; `src/local/allow-effects.js` binds a fresh permission per command when constructing the public simulator. Its public request-only route and the HTTP server remain compatible. Core server construction receives that externally bound simulator constructor rather than importing or invoking a minting factory. Cloud and local environment layering stays unchanged; each boundary owns its private runtime symbol but uses the same nominal type.

Read-only queries remain outside this first classification. Do not expand it to every command or broadly rewrite existing test interaction assertions. The token is permission, not the implementation mechanism of the Firestore write.

## Second extension and remaining audit (2026-10-05)

The 2026-10-05 extension classifies two semantically specific side-effect callbacks injected across the environment/core boundary. `submit-new-page` now forwards a fresh HTTP-request permission to its injected `saveSubmission` callback. The realtime voice presenter now receives a permission minted for each connect attempt and forwards it to the session-creation POST. The public HTTP request and browser presenter APIs remain free of capability parameters.

Generic transport callbacks such as `fetchFn` need command-level classification before migration because the same function carries reads and mutations. Follow-up audit areas include browser admin and moderation POSTs and cloud rendering/cache invalidation flows. `writeModeratorReputations`, `applyCreditEvent`, `renderContents`, and `invalidatePaths` were named in the preliminary list but are core-created or core-to-core callbacks/helpers, not distinct functions injected from the environment adapter. Direct Firestore and Storage client-object writes also remain outside this function-shaped migration. This extension does not establish repository-wide side-effect enforcement.

The compiler/boundary harness is `node scripts/run-jest.js --runInBand test/core/allowEffects.test.js`. It compiles virtual JavaScript against the actual factory and declaration without expected-error or ignore pragmas, asserting positive construction and diagnostic codes for missing/forged permissions. `test/core/allowEffectsRule.test.js` exercises real TypeScript-backed ownership checking and configured factory bans. Endpoint regressions explicitly assert that the owning token reaches `saveSubmission`; the cloud manifest regression checks adapter copy and import rewriting. Terminal repository gates and landing remain required before closing the owning bead.

## Third extension: browser admin POST commands (2026-10-05)

The admin adapter now supplies `bindEffectBoundary` to admin core. It mints a fresh frozen, privately branded permission for each command. `FetchFn` requires that permission as its first argument, and the admin core rule covers `src/core/browser/admin-core.js` and `src/core/browser/token-action.js`.

This classification is scoped to four injected-fetch POST commands: trigger render contents, generate stats, regenerate a page variant, and regenerate an author. Each command receives its permission at invocation and forwards it directly through the command call chain to the injected `fetchFn`. The general admin `fetchFn` still serves read requests elsewhere, so this migration does not classify every request or change those call sites. `test/core/browser/admin/effects.test.js` verifies the four URLs receive distinct boundary permissions. Existing admin tests use a test-only adapter to keep their URL-first fetch assertions focused on their original behavior.

## Fourth extension: render-variant CDN invalidation (2026-10-05)

The cloud render-variant adapter supplies a command permission boundary and a dedicated `effectFetchFn` for CDN cache purge POSTs. The core invalidation flow mints one fresh permission per path purge and forwards it only to that adapter. The generic injected `fetchFn`, including the metadata service token GET, is also permission-aware.

## Fifth extension: render-contents CDN invalidation (2026-10-05)

The cloud render-contents adapter supplies the same boundary and dedicated transport for its separate CDN invalidation flow. Each purge POST receives a fresh permission. The metadata service token GET through injected `fetchFn` also receives a permission.

## Sixth extension: all injected fetch functions

Every `fetchFn` injected from browser, cloud, or local adapters into core requires an `AllowEffects` first argument. Core call sites obtain a fresh value through the injected `bindEffectBoundary`; runtime adapters adapt native fetch to the permission-aware signature. This applies to GET and other methods alike. Internal native fetch closures are outside the injected-function contract. The compiler and `capability/allow-effects` lint rule enforce the signature and direct forwarding.

## Seventh extension: remaining injected fetch implementations

Chronoflow's `/config.json` and network-time requests, the OpenAI Realtime SDP exchange, and Notion Codex comment posting use the same permission-first transport contract. Each core request is wrapped in a fresh boundary permission, while browser, cloud, and local adapters adapt native fetch at their runtime edges.

## Eighth extension: generated HTML file writes

The build core's injected `writeFile` now requires an `AllowEffects` value. The generated HTML command binds each formatted or fallback write through the boundary supplied by the build entrypoint. Formatting and logging remain outside the write callback; both write paths forward the permission directly to the injected filesystem adapter.

## Ninth extension: coverage summary file writes

The coverage-summary command requires `AllowEffects` on its injected `writeFile` callback and mints the permission only around the summary write. Reading coverage input and building the summary remain outside the effect boundary. The wrapper adapts the permission-aware callback to Node's native writer.

## Tenth extension: clone report writes

The clone scanner binds report publication as one local command and forwards its permission to the injected directory creator and each report writer. Source discovery and clone analysis remain outside that boundary.

## Eleventh extension: document-store writes

The local document store binds each public store command that can bootstrap, prune, or persist workflow state. One permission is threaded through those helpers to the explicitly classified filesystem bag's `mkdir`, `rm`, and `writeFile` effects. Its `readFile` query remains outside the permission boundary. The local runtime adapts Node's filesystem methods before injecting the restricted bag; core has no direct raw filesystem alias.

## Twelfth extension: Notion Codex state and outcomes

The Notion Codex state and outcome stores bind each write operation and forward its permission to the injected directory and file writers. Read operations remain permission-free; the local adapters discard the token only when delegating to Node's native filesystem functions.

## Thirteenth extension: detached process launch

The shared detached-process launcher binds one permission for each launch and forwards it to log-directory creation, both append-only log opens, and process spawning. Notion Codex and Symphony local adapters supply the boundary and adapt native filesystem/process APIs. Symphony's default launch path now receives these adapters through its local entry point as well.

## Fourteenth extension: Symphony status persistence

Symphony status-store writes require an `AllowEffects` permission. Bootstrap creation, refresh, orphan reconciliation, launch success/failure, and runner-exit updates bind one permission per persistence operation and pass it through the injected status-store writer to both directory creations and both file writes. The local adapter discards the permission only when calling Node's native filesystem functions. Status reads remain outside this write classification.
