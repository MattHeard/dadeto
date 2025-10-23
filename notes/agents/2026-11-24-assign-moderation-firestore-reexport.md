# Assign moderation Firestore re-export

- **Challenge:** Needed to confirm there were no nested `AGENTS.md` files that would change style expectations before adding the re-export shim.
- **Resolution:** Searched the repository for additional agent instructions, then created the local Firestore re-export and updated the cloud function import to reference it.
