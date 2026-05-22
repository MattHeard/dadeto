# GCP test root browser dependencies

- Unexpected hurdle: after forwarding GCS object metadata, the moderation fixture still never reached the authenticated page state in Cloud Run Playwright.
- Diagnosis path: downloaded run `26280081884` artifacts and saw `/mod.html` load but `body.authed` never appear; root `/moderate.js` imported `./document.js` and `./moderation/endpoints.js`, while `npm run build:cloud` only packaged those modules under `/browser/...`.
- Chosen fix: include `document.js` and `moderation/endpoints.js` in the cloud root browser copy list so root `/moderate.js` can complete module evaluation, and move the `new-story.html` mobile drawer assertion under a mobile viewport.
- Next-time guidance: when a static root module fails in GCP without a clear browser console line, compare every relative import in the root module against tracked `infra/` root files, not only the `/browser/` mirror.
