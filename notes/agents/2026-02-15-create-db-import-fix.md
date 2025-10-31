# Cloud function create-db import rewrite

- **Surprise:** The legacy `get-api-key-credit` function's generated bundle only contains its own directory, so the `create-db.js`
  re-export pointing at `../get-api-key-credit-v2/create-db.js` broke once Terraform deployed it. Locally the module graph works
  because the core files live side-by-side. I assumed the build step would keep that layout for the Cloud Function too.
- **Diagnosis:** The Terraform error log showed the module resolution jumping to `/get-api-key-credit-v2/create-db.js`, which
  happens when the relative import walks above `/workspace`. Inspecting the generated `infra/cloud-functions/get-api-key-credit`
  folder confirmed it only held the re-export stub with no sibling directory.
- **Resolution:** Instead of teaching the function to reach across directories, I updated `src/build/copy-cloud.js` so the v1
  function copies the v2 `create-db` implementation directly. That keeps both bundles in sync without new rewrite rules.
- **Next time:** When sharing helpers between Cloud Functions, double-check how the archive is assembled (see
  `src/build/copy-cloud.js`) to avoid assuming other directories ship together.
