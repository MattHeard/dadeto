# 2025-12-17 Google Cloud typedef stubs

- Added handwritten `@google-cloud/firestore` typings under `types/` so `typeof import('@google-cloud/firestore').Firestore` resolves for the helpers in `src/core/cloud/get-api-key-credit-v2` and `src/cloud/get-api-key-credit`.
- Added a simple `@google-cloud/storage` stub covering `Storage`, `Bucket`, and `File#save` so the stats generator’s dependency annotations stop triggering TS2307 complaints.
- Re-ran `npm run tsdoc:check` (still fails on long-standing admin/core and cloud helper issues), plus `npm test` and `npm run lint` to ensure nothing regressed after the new typings and beta helper doc tweak.

Open questions/follow-ups:
1. Should we keep building these stubs as new cloud dependencies surface instead of installing the real npm packages in this repo?
2. How should we prioritize the remaining tsdoc errors from `admin-core.js` and the cloud suites so the validation can eventually pass end-to-end?
