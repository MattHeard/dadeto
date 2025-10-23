# get-api-key-credit-v2 snapshot core extraction

- **Challenge**: Needed to move the Firestore snapshot helper out of the V2 function entry point without breaking the copy-to-infra workflow that mirrors cloud files.
- **Resolution**: Created a core helper module that mirrors the existing create-db setup and re-exported it from the cloud wrapper so the directory copy still pulls in the helper automatically.
