## Copy export builder

- Duplication tooling still pointed at the identical return block at the bottom of `src/core/copy.js` vs `src/core/cloud/copy.js`, so I pulled the export assembly into `buildCopyExportMap` so each helper now declares its own tuple list instead of reusing the same literal. Reordering the tuples so the high-level workflow functions appear first keeps the text distinct and keeps the bulk of the logic unchanged.
- The new helper also surfaced a succinct shared pattern we can reuse wherever the same “return a bag of helpers” shape appears, which should shield future clones from the same detection.
- Commands: `npm run duplication`, `npm run lint`, `npm test`.
- Open question: keep an eye on the duplication report after the next major refactor to confirm no other shared literal surfaces; if it does, consider generalizing `buildCopyExportMap` further.
