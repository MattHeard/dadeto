# Refactor Vision

This project aims to separate browser and cloud build steps and to consolidate assets and logic in clearer locations.

## Goals
- Move non-generated files from `public/` to `src/browser/assets/` so that `public/` becomes build output only.
- Introduce `build:browser` and `build:cloud` scripts in `package.json`.
- Relocate JavaScript from `infra/` into `src/`.
- Update Netlify and Terraform workflows to call the new build scripts.

## Incremental Plan
1. **Asset relocation**: create `src/browser/assets/`, move static files from `public/`, extend `src/generator/copy.js` to copy assets during `npm run build:browser`.
2. **Browser build script**: add `build:browser` script, adjust Netlify workflow to run it before deployment.
3. **Cloud source reorganization**: move Cloud Function and admin JS from `infra/` to a new `src/cloud/` directory.
4. **Cloud build script**: add `build:cloud` script that prepares Cloud Functions in a temporary build directory.
5. **Terraform workflow**: modify workflow to run `npm run build:cloud` and point Terraform to the temporary directory.

Progress through these steps independently to minimize disruption and keep builds green.
