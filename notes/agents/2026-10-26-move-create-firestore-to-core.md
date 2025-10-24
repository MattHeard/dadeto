# Move createFirestore helper into core module

- **Challenge:** The helper previously lived in the Cloud Function entry module, so importing it in unit tests dragged in the Firestore SDK and complicated mocking.
- **Resolution:** Moved the helper into `src/core/cloud/get-api-key-credit/core.js` alongside the other reusable logic and re-exported it from the Cloud wrapper so existing imports continue to work.
