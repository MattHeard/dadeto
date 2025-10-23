# Hide Variant HTML Core Rename
- **Challenge:** Renaming the core helper required checking build scripts for hard-coded filenames to avoid deployment gaps.
- **Resolution:** Updated the Cloud copy script and re-export shim to target `core.js`, then ran the full Jest suite to confirm the new path works end-to-end.
