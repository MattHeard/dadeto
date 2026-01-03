# Refined typing for render/status helpers

- Injected new typedefs into `src/core/cloud/render-variant/render-variant-core.js`, aligning the render metadata/render plan/persistence helpers with the story/parent lookup helpers and documenting the new `RenderContext`, `ResolveRenderPlanDeps`, and `BuildRenderPlanDeps`.
- Typed `submit-new-page` and `submit-new-story` APIs by declaring structured request/context/dependency shapes, casting the Firestore helpers, and tightening the CORS/authorization helpers so future tsdoc passes can focus on the remaining cloud layer.
- Attempted to run `npm run tsdoc:check`, but the suite still fails because of the longstanding presenter/toy issues plus the remaining structural gaps in the cloud helpers (see `tsdoc-check-output.txt` and `/tmp/tsdoc.log`).

**Next steps:** Continue chipping away at `submit-new-page`/`submit-new-story` typing (particularly the request handler signature and Storage deps) and re-run `npm run tsdoc:check` so the failure surface starts moving back toward the cloud helpers alone.
