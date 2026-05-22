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

Run `26292999041` moved past the missing `/core/commonCore.js` 404 and exposed
browser-runtime issues instead of packaging 404s. Static pages imported
`getIdToken` from `/googleAuth.js`, but the module only exported
`initGoogleSignIn` and `signOut`. The moderation page also threw
`Illegal invocation` from `/core/browser/admin-core.js` because
`document.querySelectorAll` was called after being detached from its `document`
receiver.

The fix exports `getIdToken` from `src/browser/googleAuth.js` and calls
`querySelectorAll` with `document` as its receiver in `createQuerySelectorAll`.
Regression tests now cover the static-page token export and a browser-like
`querySelectorAll` method that throws if invoked without its document context.

Run `26294548169` moved moderation past authentication: `body.authed` was
present and the buttons existed, but the moderation variant fetch returned
`HTTP 500`, leaving the buttons disabled. The same run showed the new-story
submit test falling back to native form navigation because the shared
`googleAuth.js` module called Firebase Auth before initializing a Firebase app,
and several static pages imported an `isAdmin` export that the shared module did
not provide.

The chosen fix initializes Firebase in `src/browser/googleAuth.js`, exports the
shared `isAdmin` helper alongside `getIdToken`, and corrects named Firestore
database selection for Cloud Functions. The Firestore Admin SDK accepts
`getFirestore(databaseId)` when no app object is supplied; passing
`undefined, databaseId` is not a safe way to select the gcp-test database and is
the likely cause of the `get-moderation-variant` 500 against the seeded named
database. Next-time guidance: every cloud function that reads fixture data must
have a unit guard for the exact named-database call shape, because the cloud E2E
database is intentionally not the production default database.

Run `26296507133` fixed the new-story path and proved authentication was no
longer the blocker: both new-story tests passed, while moderation still failed
because `get-moderation-variant` returned `HTTP 500`, and `new-page` failed
because its E2E expected the production submit URL instead of the per-run
`config.json` endpoint. The moderation fixture had been seeding the moderator
assignment as a Firestore `DocumentReference`, which is unnecessarily fragile
across the seed script and Cloud Function runtime boundary.

The chosen fix stores the seeded assignment as a plain document path and teaches
`get-moderation-variant` and `submit-moderation-rating` to accept either the
existing reference shape or a string path. The E2E for `new-page.html` now reads
`/config.json` and asserts the form action matches the deployed environment's
`submitNewPageUrl`. Next-time guidance: seeded fixture contracts should prefer
portable primitives at process boundaries unless the production behavior being
tested is specifically Firestore reference serialization.

Run `26298049887` proved the `new-page` config fix and kept new-story green:
9 Playwright tests passed, with only the moderation fixture still failing. The
remaining failure is still `get-moderation-variant` returning `HTTP 500`, but
the current browser diagnostics only logged the status code. The next loop adds
response-body diagnostics in two places: `src/browser/moderate.js` includes a
short failed-response body snippet in its thrown HTTP errors, and the
cloud-backed fixture logs 500 response bodies directly from Playwright. Next
time guidance: when a cloud endpoint returns a generic 500 through a browser
test, capture the response body before changing endpoint behavior again.

Run `26299469862` confirmed the browser-side response capture but still only
returned Express' generic `Internal Server Error` body from
`get-moderation-variant`. That means the endpoint was failing before our
responder could return a structured body, or inside middleware such as CORS.

The chosen fix wraps the cloud function handler and Express middleware error
path with a short diagnostic 500 body. This is deliberately small and
cloud-only: it should not change successful moderation behavior, but the next
gcp-test run should expose whether the failure is CORS, Firestore data shape,
or another runtime exception. Next-time guidance: for short-lived gcp-test
functions, prefer safe diagnostic bodies over opaque Express defaults so cloud
E2E failures produce an actionable loop artifact in the Playwright logs.

Run `26300898291` on `f727120aa` used that diagnostic path and exposed the
next concrete backend failure: `get-moderation-variant failed: Cannot read
properties of undefined (reading 'headers')`. The endpoint was detaching the
Express `req.get` method before calling it, so Express tried to read
`this.headers` from an undefined receiver. The same run also showed a
`new-story` browser race where the test clicked submit before the page's
enhanced submit listener was installed, allowing native form navigation to the
submit Cloud Function instead of the mocked fetch path.

The chosen fix keeps Express-style request getters bound to their original
request object in both the moderation responder and the shared cloud submit
request normalizer. The new-story page now marks the form with
`data-submit-handler-ready="true"` after installing the submit listener, and
the E2E waits for that readiness marker before clicking. Next-time guidance:
when a browser page upgrades native forms with JavaScript, expose a tiny
readiness contract for cloud E2E rather than relying on incidental timing after
`domcontentloaded` or `/config.json`.

Run `26302334020` on `ffa355370` proved the request getter and new-story
fixes: new-story passed, `get-moderation-variant` no longer returned 500, and
the moderation buttons became usable. The remaining failure was deterministic
test data, not a browser or endpoint crash: after approving the manually
assigned first page, the assignment function could randomly select that same
zero-rated page again, so the E2E still saw the first page content instead of
the second seeded page.

The chosen fix makes the fixture contract explicit. The first variant is
pre-rated because the seed script assigns it directly to the moderator; the
second variant remains zero-rated so the deployed assignment function selects
it as the next moderation job. A small source-level Jest guard now protects
that fixture contract. Next-time guidance: when an E2E expects ordered progress
through a randomized selector, encode the ordering in the fixture data rather
than depending on RNG.

Run `26303709236` on `55d12209b` still failed only the moderation Playwright
case after fixture seed, seeded page readiness, and cleanup all succeeded. The
artifact logs showed the post-approval `assign-moderation-job` request as
`net::ERR_ABORTED` when the test ended, while the assertion used the default
5 second timeout. That points at cloud cold-start/assignment latency rather
than a completed assignment returning the first page again.

The chosen fix gives the post-approval second-content assertion a 30 second
timeout in the cloud E2E. Next-time guidance: assertions that depend on a
freshly invoked Cloud Function and a follow-up render/load cycle should use a
cloud-realistic timeout, while still keeping the individual expected UI state
specific.
