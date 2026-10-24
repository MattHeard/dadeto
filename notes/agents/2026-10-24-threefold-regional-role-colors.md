# Threefold regional role colors

- **Unexpected hurdle:** The main Broken Gate renderer already had distinct character badges, but compact scene-specific renderers returned to unlabelled flat rectangles.
- **Diagnosis:** Trace each `renderThreefoldFrame` branch and compare shape metadata; the region finalizer receives named NPC sprites with logical cell bounds, while Mara has the stable `mara` identity.
- **Fix:** Color Mara's compact sprite cyan and named resident sprites magenta in the shared small-world finalizer. Preserve their projected bounds and scale-derived sizes; add a regression assertion in Hearthgaps.
- **Next time:** Test the general and specialized renderer paths separately. Shared presentation rules should be applied at the last common finalizer when specialized scenes bypass the primary sprite renderer.
