Unexpected hurdle: the Playwright run still logged Google Identity Services origin rejection after the internal-origin guard had already been added in `src/browser/googleAuth.js` and `infra/browser/googleAuth.js`.

Diagnosis path: the failed `gcp-test` artifact showed the moderation page on `http://10.132.0.55/mod.html` still hitting GIS, which pointed to a deployed static bundle drift. Inspecting the repo revealed `public/browser/googleAuth.js` was still unguarded.

Chosen fix: align `public/browser/googleAuth.js` with the guarded browser auth module and add a regression test that reads the public bundle to ensure the guard stays present.

Next-time guidance: when the Playwright job still shows GIS origin errors after a browser-module fix, check the generated/public browser bundle copies before changing the test or the Cloud Run wiring.
