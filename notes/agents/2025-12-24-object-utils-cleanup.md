# Object utils cleanup

- Unexpected: removing `src/core/objectUtils.js` and its `public/browser` copy required confirming no remaining references (tests already import `browser-core`, public assets copy scripts don't depend on the deleted module), so I double-checked with `rg` before deleting to avoid breaking far-flung builds.
- Learned: whenever a shared helper is hoisted into a different module, keep clearing the dependent sprockets (facades, generated copies, docs) in the same change so the removal is irreversible without lingering references.
- Next: rerun `npm run copy` + `npm run generate` if the public folder ever needs to reflect these helper paths again; otherwise the removal stands with the current build artifacts living under `public/core`.
- Open question: should we revisit the notes that mention `core/objectUtils.js` to avoid confusion for future contributors now that it no longer exists?
