# THREEFOLD finite render viewport

- Unexpected hurdle: the resolver's overflow diagnostics existed, but the Broken Gate render path did not supply a viewport, so no out-of-map object could be reported there.
- Diagnosis: the renderer sizes its Mosslight world map from scene bounds and scale, then shifts projected cells by `VIEW_ORIGIN` for camera placement. The corresponding logical viewport therefore starts at the negative camera origin and uses the same finite map width and height.
- Fix: pass that finite logical-cell capacity into `resolveSceneLayout`; leave all canonical scene bounds untouched and surface out-of-map objects as overflow metadata.
- Evidence: focused `npm run check:impact:run -- --files src/core/browser/game/threefold/renderer.js test/core/browser/game/threefold-renderer.test.js` passed 27 suites / 341 tests, ESLint/core-parse, zero clones, and 100% statements, branches, functions, and lines for the changed renderer. Coverage includes all supported Broken Gate scales and a displaced wall whose overflow record is returned without source mutation. Full fast check, build, and post-merge CI are pending.
- Next guidance: keep the visible layout and finite map capacity aligned as map sizing changes; do not clamp or relocate authored entities to make them fit. Continue with semantic composite authoring and interaction eligibility as separate Rank 1 slices.
