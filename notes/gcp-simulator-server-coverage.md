# GCP simulator server coverage

- The injected-server unit suite covers route registration, request adaptation, lazy simulator reuse, and listener address fallback behavior.
- Evidence: ESM-focused Jest passed 1 test with strict 100% statements, branches, functions, and lines for `src/core/local/gcp-simulator/server.js`.
- The full listener integration test remains an unrelated simulator/firestore timeout; no coverage exclusion was used.
