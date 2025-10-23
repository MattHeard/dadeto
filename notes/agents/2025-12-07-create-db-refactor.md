## Create DB refactor

- **Challenge:** Unit testing the new Firestore factory initially required importing `src/cloud/get-api-key-credit-v2/index.js`, which pulls in `firebase-functions/v2/https` and `@google-cloud/firestore`. Jest could not load those dependencies in the ESM test environment, triggering module resolution failures.
- **Solution:** Extracted the database factory into `create-db.js`, allowing the test to import the helper without loading the Firebase-specific modules. This kept the production code decoupled and enabled a straightforward Jest unit test.
