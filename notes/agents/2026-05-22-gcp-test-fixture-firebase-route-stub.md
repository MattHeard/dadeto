Unexpected hurdle: the GCP Playwright fixture still failed the moderation test after
the seed token was written directly to sessionStorage.

Diagnosis path: the failed run showed `/seed.json`, `/p/1a.html`, and `/p/2a.html`
were all ready, but `/mod.html` never added `body.authed`. The app has a cached-token
path, so the next likely blocker was the page module itself not evaluating. The
moderation and admin entrypoints import Firebase browser SDK modules from the public
CDN at top level, which is outside the behavior this GCP fixture is trying to prove.

Chosen fix: the Dendrite fixture Playwright setup now routes those Firebase browser
SDK module requests to tiny local module stubs. The stubs provide the admin user,
cached ID token getter, auth-state callback, and no-op sign-in helpers while preserving
the real Dendrite pages, real GCP endpoints, and real datastore-backed content flow.

Next-time guidance: when a cloud E2E uses an already-minted admin token, avoid making
the test depend on third-party browser SDK fetches unless the test is explicitly about
sign-in. Route or inject the minimum auth surface so failures stay attributable to
Dendrite's own end-to-end path.
