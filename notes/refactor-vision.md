# Refactor Vision

This project aims to separate browser and cloud build steps and to consolidate assets and logic in clearer locations.

## Completed Work
- Introduced `build:browser` and `build:cloud` scripts in `package.json` and wired `npm run build:browser` into the Netlify deployment workflow.
- Relocated Cloud Function JavaScript from `infra/` into `src/cloud/` and ensured `npm run build:cloud` packages the functions for Terraform.
- Updated both `gcp-test` and `gcp-prod` workflows to execute `npm run build:cloud` before running Terraform.

## Next Steps
- Finish relocating legacy HTML, audio, and image assets from `public/` into `src/browser/assets/` (or module-specific folders) so that `public/` only contains generated output.
- Slim down `src/core/copy.js` so it copies only the assets that must ship with the browser bundle instead of mirroring entire source directories into `public/`.
- After the directory reshuffle, run `npm run build:browser` to repopulate `public/` and confirm no source files remain.

Progress through these steps independently to minimize disruption and keep builds green.
