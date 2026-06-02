# Copy Cloud Relocation Note

- Moved the implementation from `src/core/copy-cloud.js` into `src/core/build/copy-cloud.js` so the build pipeline lives under the build domain instead of the core root.
- The move initially broke coverage because `jest.config.mjs` still excluded the old path; updating the exclusion to the new location restored the previous behavior.
- Next time, when relocating a top-level script, check `collectCoverageFrom` and similar path-based rules at the same time as the import updates.
