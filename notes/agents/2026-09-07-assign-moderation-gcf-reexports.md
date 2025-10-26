## Summary

- Routed the express, cors, and Firebase Admin helpers through the assign moderation job GCF shim so downstream code can import a single module.
- Verified that the destructured imports in the Cloud Function entry point still support aliasing `getFirestore` for the cached instance helper.

## Challenges

- Remembering to re-alias `getFirestore` after destructuring from the shim would have broken the existing helper signature; double-checked that the alias preserved the current API.
