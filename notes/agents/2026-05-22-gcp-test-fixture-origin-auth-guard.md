## Unexpected hurdle

The gcp-test fixture still failed after loading the seed manifest through the
Playwright request context and installing the admin token with `page.addInitScript`.
The cloud browser reached `/mod.html`, but the page never added the `authed`
class.

## Diagnosis path

The preceding GCP run narrowed the failure to one assertion in
`test/e2e/dendrite-fixture.spec.ts`: the moderation page was rendered but did
not observe authenticated browser state. Because request-context fetches do not
prove same-origin browser storage, the fixture needed an explicit origin-level
token check before loading each authenticated surface.

## Chosen fix

The fixture now installs the seeded token at the browser-context level and uses
`gotoAuthenticated` for moderation/admin pages. That helper visits `/seed.json`
in the actual page, sets `sessionStorage.id_token` on the deployed origin,
polls until the token is readable, and only then navigates to `/mod.html` or
`/admin.html`. The authed assertion also polls a compact debug snapshot so any
future cloud-only failure reports whether the token, page title, and expected
DOM were present.

## Next-time guidance

When a cloud-only Playwright failure depends on browser storage, validate the
storage on the same browser origin immediately before loading the page under
test. Context/request setup is useful, but it should not be the only evidence
for auth-sensitive E2E flows.

## Follow-up finding

Run `26284020304` proved the origin token guard was not the last blocker: the
moderation page still stayed unauthenticated while logging root 404s. The
diagnosis moved from storage to cloud packaging. `infra/admin-core.js` had been
generated from the deep core implementation, whose relative imports point at
root files that are not shipped as browser modules. The cloud package now copies
the browser wrapper from `src/browser/admin-core.js` so root browser entrypoints
resolve `../core/browser/admin-core.js` consistently.

Run `26285207606` exposed the same class of packaging issue one module deeper:
the root `load-static-config-core.js` was also generated from the deep core
implementation. That file imported `./browser-core.js`, but the root static
bundle only ships browser wrapper entrypoints and the `/core/browser/...` tree,
so the module graph failed before `moderate.js` reached its synchronous
`getIdToken()` check. The cloud package now copies the browser wrapper from
`src/browser/load-static-config-core.js`, and
`test/infra/cloudBrowserEntrypoints.test.js` guards both root wrappers.
