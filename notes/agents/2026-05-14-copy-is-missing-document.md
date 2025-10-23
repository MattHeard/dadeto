# Copy isMissingDocument helper for infra build

## Challenges
- The cloud copy script only forwarded the wrapper `isMissingDocument.js` from `src/cloud`, leaving the core helper out of sync in the generated Cloud Function directory.

## Resolutions
- Added an explicit copy step in `src/cloud/copy-to-infra.js` so the core `isMissingDocument.js` is written into `infra/cloud-functions/get-api-key-credit` during the build.
