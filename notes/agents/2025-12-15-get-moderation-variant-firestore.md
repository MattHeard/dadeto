# get-moderation-variant firestore re-export

- **Challenge:** The get-moderation-variant function expected a colocated `firestore.js` helper, but only the shared root module existed, leading to missing-file errors when preparing the function bundle.
- **Resolution:** Added a lightweight re-export that forwards to the shared Firestore utilities so the function directory now has the expected helper without duplicating logic.
