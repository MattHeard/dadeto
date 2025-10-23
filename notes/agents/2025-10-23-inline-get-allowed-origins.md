## 2025-10-23 Inline getAllowedOrigins

- Inlined `getAllowedOrigins` into the assign moderation job entrypoint to remove the thin re-export layer.
- Double-checked that the production/test origin logic matched the shared helper before deleting the redundant `cors-config` module.
