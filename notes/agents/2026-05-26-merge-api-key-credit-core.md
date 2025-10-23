# Merge get-api-key-credit helpers into core module

- **Challenge:** Replacing three separate modules with a single `core.js` required updating the cloud wrapper imports and the infra copy script without breaking the deployment packaging pattern.
- **Resolution:** Introduced a new cloud re-export at `src/cloud/get-api-key-credit/core.js`, updated the handler index to consume it, and adjusted `copy-to-infra.js` to copy the consolidated `core.js`, ensuring the function bundle still receives the full implementation.
