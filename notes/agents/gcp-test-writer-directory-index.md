# gcp-test writer directory index

- **Unexpected hurdle:** The cloud Playwright run kept failing on `page.goto('/writer/')` even though the writer app itself was healthy and the static bucket already contained `writer/index.html`.
- **Diagnosis path:** I pulled the uploaded Cloud Run logs from the failing `gcp-test` run and found the exact assertion: `writer.spec.ts` received a `404` on the initial navigation. That pointed away from the app and toward the GCS proxy, which was translating `/writer/` into the bucket key `writer` instead of `writer/index.html`.
- **Chosen fix:** Split the proxy path mapping into a small helper module and taught it to append `index.html` for directory-style URLs. I also added a regression test that covers `/`, `/writer/`, and a normal file path.
- **Next-time guidance:** When a Playwright cloud run fails on the very first navigation, check the proxy or load-balancer path translation before changing page assertions. The error often lives one layer below the app.
