Writer page was missing from the Playwright test deploy because infra/main.tf did not upload public/writer/index.html into the static bucket. Added it as a static object so /writer/ can resolve in GCP test environments.

Unexpected hurdle:
- The gcp-test failure showed a 404 on /writer/ before the submit failure, which looked like an app bug at first.

Diagnosis:
- Compared the deployed static object list in infra/main.tf against src/content/pages/writer/index.html and public/writer/index.html.
- Confirmed the writer page exists in source/build output but was not in the Terraform upload set.

Chosen fix:
- Added writer/index.html to local.static_site_objects in infra/main.tf, sourcing it from public/writer/index.html.

Next-time guidance:
- When Playwright sees a 404 on a page that exists locally, check the static bucket manifest before chasing the backend.
