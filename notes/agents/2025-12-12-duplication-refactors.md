## Duplication refactors

- Shared the Markdown formatting guard between `pre.js` and `italics.js` via `withFallback`, then ran `npm run lint` and `npm test` so the helper change stayed green.
- Added `normalizeExpressRequest` plus the handler/responder helpers to `src/core/cloud/request-normalization.js` and `src/core/cloud/submit-shared.js`, letting every cloud submit module reuse the same request adaptor and response writer instead of duplicating those blocks.
- Refactored the CDN invalidation helper to accept a trimmed dependency set and extracted a single `copyFiles` driver so `copy.js` no longer repeats its `copyFileToTarget` loop; also added `incrementIndexAndReturnTrue` in `toys-core.js` to collapse the duplicated `index` advance/return pattern.
- Commands: `npm run duplication`, `npm run lint`, `npm test`.
