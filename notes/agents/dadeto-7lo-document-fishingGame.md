## dadeto-7lo: Lint: document fishingGame helper

- **Unexpected:** The helpers I extracted (time-of-day and season lookups) still tripped the complexity rule until I changed them from loop-based range lookups to plain hour/month tables, so each function became a single-index lookup with normalization.
- **Work:** Added missing param/return descriptions for `isBaitError`, simplified `getFishingOutcome` to rely on the known fallback, introduced `requireNumericEnvFunction` for the shared env guards, and replaced the range logic with `timeOfDayByHour`/`seasonByMonth` tables so the flow stays under the default complexity limit.
- **Tests:** `npm run lint` (still reports the pre-existing warnings in `src/core/browser/toys/2025-03-29/get.js`, `src/core/cloud/render-variant/render-variant-core.js`, `src/core/cloud/submit-new-page/submit-new-page-core.js`, and `src/core/commonCore.js`).
