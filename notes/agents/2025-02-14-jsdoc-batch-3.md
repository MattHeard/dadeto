# 2025-02-14 — JSDoc Batch 3

## Highlights
- Documented the assign moderation workflow wiring so every helper lists its Firebase and timing dependencies inline.
- Collapsed the lingering anonymous `@param` tags in the setup CORS helper to unblock the `require-param-*` rules.

## Follow-ups
- The remaining lint noise is all complexity/max-params; circle back once the JSDoc queue is empty so we can start extracting helpers safely.
