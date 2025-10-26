# get-api-key-credit-v2 structure alignment

- **Challenge:** The v2 Cloud Function still pulled its core and GCF dependencies directly, so renaming the core module and updating the copy script risked missing files in the deployment bundle.
- **Resolution:** Added the new bridge modules first, renamed the core implementation to `get-api-key-credit-v2-core.js`, and expanded `copy-cloud.js` so the renamed core, shared common/core shims, and the GCF bridge are staged for deployment alongside the existing helpers. Jest confirmed the updated wiring.
