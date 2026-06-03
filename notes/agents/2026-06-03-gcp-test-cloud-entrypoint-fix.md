# GCP Test Cloud Entrypoint Fix

## Unexpected Hurdle

The latest `gcp-test` workflow reached Terraform Apply but failed while creating
Cloud Functions. GCP reported that functions such as `renderVariant`,
`generateStats`, and `processNewStory` were not defined in the provided modules.

## Diagnosis Path

The failed run logs showed Terraform still configured legacy `entry_point`
values in `infra/main.tf`. The current `src/cloud/**/index.js` files export the
deployment function as `handle` after the cloud entrypoint cleanup. The
render-contents HTTP trigger is the one intentional exception and exports
`handleTrigger`.

## Chosen Fix

Updated `infra/main.tf` so Cloud Functions target `handle` for the renamed
entrypoints and `handleTrigger` for `trigger_render_contents`. Left
`get_api_key_credit` on `handler` because that module still exports the
backwards-compatible `handler` alias.

Added a regression check in `test/infra/cloudBrowserEntrypoints.test.js` so the
Terraform entry points cannot quietly drift back to the legacy names.

## Evidence

- `terraform fmt -check infra/main.tf`
- `node --experimental-vm-modules ./node_modules/.bin/jest --runInBand test/infra/cloudBrowserEntrypoints.test.js`
- `npm test`
- `npm run lint`
- `npm run check`

`npm run check` passed all 8 gates with 556 test suites, 2953 tests, and 100%
coverage.

## Next-Time Guidance

When renaming cloud entrypoint exports, update `infra/main.tf` in the same loop
or add the compatibility alias intentionally. The local infra test now guards
the deployment-facing names, but GCP is still the final validation for the full
function load path.
