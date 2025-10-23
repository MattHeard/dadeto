# Remove shared cors-config default export

- **Challenge:** Confirming that nothing relied on the `config` default export from `src/cloud/cors-config.js`, including historical re-export shims like the assign moderation job wrapper.
- **Resolution:** Re-ran dependency search after deleting the default export, updated the assign moderation job re-export shim, and ensured all Cloud Functions continue to import `getAllowedOrigins` explicitly. Test + lint suites still pass.
