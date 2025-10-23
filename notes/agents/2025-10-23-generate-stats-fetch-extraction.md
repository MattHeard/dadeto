# Generate stats fetch extraction

- **Challenge:** Needed to make the Cloud Function's bound `fetch` reusable without keeping the logic embedded in `index.js`.
- **Resolution:** Added `src/cloud/generate-stats/gcf.js` to export the bound fetch function and updated the entry point to consume the shared helper.

