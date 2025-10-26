# Rename shared GCF helper

- **Challenge:** Renaming the shared Cloud Functions helper risked leaving stale relative imports in multiple handlers.
- **Resolution:** Renamed `src/cloud/gcf.js` to `src/cloud/common-gcf.js` and updated each cloud function entry point that re-exports or imports the helper to ensure consistent module paths.
