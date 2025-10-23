# Inline submit-new-story cors-config

- **Challenge:** Removing the local wrapper required double-checking that `index.js` could pull the environment-driven origins directly without breaking the deployment copy script.
- **Resolution:** Swapped the wrapper import for a direct `getAllowedOrigins` call and deleted the unused module after verifying no other files referenced it.
