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

Run `26286495223` showed the remaining root module upload gap. The moderation
entrypoint imported `./authedFetch.js`, `./document.js`, and
`./moderation/endpoints.js`; `document.js` also imported `./logging.js`. Those
files were generated into `infra/`, but the Terraform `static_site_objects` map
did not upload them at the root, so the browser module graph failed before the
auth bootstrap could add `body.authed`. The fix adds those root module objects
to `infra/main.tf`, copies `logging.js` during `npm run build:cloud`, and points
the logging wrapper at the uploaded `/core/browser/browser-core.js` tree. The
cloud browser entrypoint guard now checks both the Terraform upload list and the
generated root wrapper.

Run `26287834508` still failed at the same authenticated-state assertion after
the root upload fix, but the logs only showed generic browser 404 console
messages. The next loop adds targeted Playwright diagnostics for failed
requests, HTTP responses with status `>= 400`, and a compact auth snapshot
right after `/mod.html` navigation. This should identify the exact URL or state
transition still blocking `body.authed` in the cloud-only browser environment
without granting local tooling direct GCP delete capability.

Run `26289173042` did not reach Playwright. Terraform failed while creating
`google_vpc_access_connector.playwright` with a GCP internal error:
`Failed to create a VPC Access connector. Please delete the connector manually.`
The run's cleanup phase still destroyed tracked resources successfully, but the
failure mode was in the brittle Serverless VPC Access connector path rather than
the application E2E logic.

The chosen fix removes the Playwright VPC Access connector resource, the
`vpcaccess.googleapis.com` service binding, the connector CIDR variable, and the
extra `roles/vpcaccess.admin` permission. The Playwright Cloud Run job now uses
a direct VPC network interface on the selected network/subnet with
`PRIVATE_RANGES_ONLY` egress, which keeps private access to the internal GCS
proxy without allocating a separate connector `/28`.

Next-time guidance: prefer Cloud Run direct VPC interfaces for new GCP test jobs
unless there is a concrete platform limitation. If a connector comes back, guard
it with a very explicit reason and cleanup playbook because failed connector
creation can require manual console cleanup.

Run `26290452987` proved the direct VPC path: cloud Terraform format,
validation, planning, apply, fixture seeding, and seeded-page readiness all
passed. The remaining Playwright failure was again in the moderation fixture.
The new diagnostics showed the seeded ID token and approve button were present,
but `body.authed` was never added because `/core/browser/admin-core.js` and
`/core/browser/common.js` returned 404s in the browser module graph.

The root cause was the generated static package, not the test auth setup:
`infra/core/` is intentionally ignored and generated by `npm run build:cloud`,
but that build only copied a couple of deep core browser files. The fix adds a
full `src/core/browser` to `infra/core/browser` copy step so Terraform's
existing `dendrite_core_files` upload can publish every deep browser module
imported by the root wrappers. The infra guard now checks that the copy step and
the Terraform upload resource stay connected.

Run `26291663155` confirmed the full browser subtree copy but exposed one more
shared-module edge: `/core/browser/admin-core.js` imports `../commonCore.js`,
which resolves to `/core/commonCore.js` in the static site. The generated cloud
bundle already shipped `/commonCore.js`, but not `/core/commonCore.js`, so the
moderation page still stopped before adding `body.authed`.

The fix now copies `src/core/commonCore.js` to both root locations:
`infra/commonCore.js` for root wrappers and `infra/core/commonCore.js` for
deep `/core/browser/*` modules. The cloud browser entrypoint guard records this
explicitly so future browser module packaging work keeps the shared core module
on the same uploaded path that native ESM resolution requests in GCP.
