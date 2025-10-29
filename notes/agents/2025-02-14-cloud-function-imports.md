# Cloud function import paths

- **Challenge:** Cloud Functions deployments failed because ES module imports such as `../firebaseApp.js` resolve outside the
  function bundle once Terraform zips the generated sources.
- **Fix:** Added local re-export shims (e.g., `./firebaseApp.js`, `./firestore.js`) and copied new shared core helpers so each
  bundle contains the modules it imports without escaping its directory.
