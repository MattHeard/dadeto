# 2026-05-22 gcp-test fixture auth storage

Unexpected hurdle: after seeded story pages were rendered synchronously, gcp-test
reached Playwright but the moderation fixture failed because `/mod.html` never
observed an authenticated body state.

Diagnosis path: run 26276397857 showed `seed.json`, `index.html`, `p/1a.html`,
and `p/2a.html` all passed readiness. The Cloud Run Playwright logs isolated the
failure to `dendrite-fixture.spec.ts`, where the page expected `<body>` to gain
the `authed` class but received an empty class list.

Chosen fix: set `sessionStorage.id_token` directly on the current `/seed.json`
page origin after reading the manifest, while keeping `page.addInitScript` for
future document loads. This mirrors what `/mod.html` reads through `getIdToken`.

Next-time guidance: when a Playwright fixture reads a manifest from the same
origin, prefer writing origin storage directly before navigation instead of
depending only on init-script timing.
