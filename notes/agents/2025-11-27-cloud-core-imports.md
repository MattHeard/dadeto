# Cloud core import adjustments

- Terraform started failing because the Gen1 functions tried to load `../cloud-core.js`, which resolves to `/cloud-core.js` once the function directory is zipped and extracted into `/workspace`. I confirmed the error by checking the stack trace from Terraform and grepping the `infra/cloud-functions` tree for `../cloud-core.js`; only the mark-variant-dirty core/verify modules and the generate-stats verify helper were still using that parent path.
- I considered changing the packaging so each function was zipped with a parent `cloud-core.js`, but that would have required reworking the archive paths across every Terraform resource. Instead I taught `src/build/copy-cloud.js` to rewrite those specific imports to `./cloud-core.js` after the files land in `infra/cloud-functions`, then reran `npm run build:cloud` to regenerate the deployment copies and confirmed the rewrite ran. The browser helper files that the build temporarily spits out were deleted afterward so the working tree stays clean.
- Lesson: Cloud Functions treat their directory as the root of the bundle, so any shared helpers must be reachable without walking up to the parent. Future shared helpers should either live in the same folder or trigger the same rewrite once deployed to avoid `ERR_MODULE_NOT_FOUND`.

Open question:
- Should we add a targeted test or lint for `../cloud-core.js` in `infra/cloud-functions/*` to catch future regressions automatically, or would that just duplicate what the rewrite already covers?
