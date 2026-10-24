# Threefold renderer coverage invariant

- Unexpected hurdle: a test fixture with resident vertical bounds removed failed before rendering with `World geometry requires increasing z bounds.`
- Diagnosis: Threefold validates physical bounds before projection, and the projected actors preserve those bounds as `physicalBounds`; the resident renderer's missing-bounds and missing-z fallbacks were unreachable from valid simulation state.
- Fix: require validated vertical bounds in the private resident renderer contract and remove the unreachable geometry fallback and nullish height defaults. Keep the type assertion at the projection boundary aligned with `createRenderWorld`'s preserved bounds.
- Evidence: 45 Threefold suites / 689 tests passed with renderer-only coverage; the subset report measured 99.63% statements, 98.64% branches, 100% functions, and 100% lines and remained below the global 100% threshold because it omits other renderer paths. The zero-count `personSprite` branches are gone, but other renderer and repository coverage gaps remain. `npm run check`, `npm run build`, and `git diff --check` passed.
- Next: continue the remaining renderer branches under Bead `dadeto-3jh8`; never lower the 100% thresholds or exclude source.
