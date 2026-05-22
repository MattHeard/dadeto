# 2026-05-22 gcp-test fixture direct story render

Unexpected hurdle: after direct contents rendering fixed the seed step, gcp-test run
26275146659 still failed before Playwright because the workflow timed out waiting
for `p/1a.html`.

Diagnosis path: the failed log showed `seed.json` and `index.html` existed, so the
remaining failure was isolated to story page HTML. The seed script had been
depending on the Firestore `render-variant` trigger to render seeded variants in
time for the setup wait loop.

Chosen fix: keep seeding the mock story into the real datastore, then render the
seeded variants directly from `scripts/gcp-test-fixture.js` with the shared
`createRenderVariant` core against the real test Firestore database and static
bucket. The setup no longer depends on the asynchronous trigger race, while the
E2E still reads static story pages generated from real GCP datastore content.

Next-time guidance: fixture setup should make readiness artifacts synchronously
when a following workflow step blocks on them. Use deployed endpoints for the
behavior under test, not for prerequisite rendering that makes the test fixture
available.
