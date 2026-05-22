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
