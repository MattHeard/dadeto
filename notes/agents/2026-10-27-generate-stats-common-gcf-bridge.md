# Generate stats common GCF bridge

- **Challenge:** Needed to add a local bridge module without breaking existing re-export behavior.
- **Resolution:** Introduced `generate-stats/common-gcf.js` to re-export the shared helpers and updated the GCF entry point to consume the new bridge.
