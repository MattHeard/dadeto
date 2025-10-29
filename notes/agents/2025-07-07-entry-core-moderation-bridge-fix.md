## Entry/Core moderation bridge import

- **Challenge:** The new moderation endpoints factory lived under `src/core/`, but the browser entry attempted to import it directly, which breaks when bundling from cloud storage buckets lacking access to core internals.
- **Resolution:** Added a `src/browser/moderation/endpoints.js` re-export and updated `moderate.js` to consume the bridge so the entry layer can stay within its allowed surface.
