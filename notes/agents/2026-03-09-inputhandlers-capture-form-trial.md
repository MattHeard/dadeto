## Context

`dadeto-hoh6` tested the exploratory `directory-shared-core` convention against the current `src/core/browser/inputHandlers` capture-form split.

## Result

The current split should stay as-is for now.

- [browserInputHandlersCore.js](/home/matt/dadeto/src/core/browser/inputHandlers/browserInputHandlersCore.js) contains generic input-handler lifecycle and DOM wiring such as input mirroring, listener disposal, insertion, and reveal/enable helpers.
- [captureFormShared.js](/home/matt/dadeto/src/core/browser/inputHandlers/captureFormShared.js) contains a narrower concept: capture-form payload serialization plus article-level auto-submit lookup for toy-backed capture widgets.

## Why not consolidate

Moving the capture helpers into `browserInputHandlersCore.js` would make the directory-named shared module less coherent, not more coherent.

- The capture helpers are not generic across the directory; they are specific to the gamepad/keyboard toy-capture flow.
- They depend on structured payload serialization and article-scoped auto-submit behavior that ordinary handlers in the directory do not share.
- The present split is therefore evidence that `inputHandlers` currently contains at least two concepts: general input-handler wiring and toy capture-form plumbing.

## Architectural lesson

This trial suggests the exploratory convention should remain a preference, not a forced merge rule. When moving a helper into the directory-named shared module would make that module less conceptually coherent, that is evidence to keep the narrower helper file or eventually split the directory shape rather than flatten everything into one shared core.
