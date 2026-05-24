## non-core-thin exemption removal (2026-05-24)

- **Unexpected hurdle:** The exemption list had no stale entries; every exempt file still exceeded the 50-line gate.
- **Diagnosis path:** Measured line counts for each exempt file, selected the smallest (`src/build/head.js`), and validated it could be made thin without behavior changes.
- **Chosen fix:** Simplified inline script scaffolding and removed non-functional comments/spacing to bring `src/build/head.js` under the limit, then removed its exemption entry.
- **Next-time guidance:** Periodically rank exemptions by line count and chip away at the shortest ones first to reduce baseline safely.
