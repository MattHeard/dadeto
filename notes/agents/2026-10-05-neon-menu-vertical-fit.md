# Neon menu vertical fit

- **Unexpected hurdle:** The earlier menu fix wrapped long labels horizontally but still chose up to five options for the fixed-height screen. A wrapped option could displace the footer or lower rows beyond the visible panel.
- **Diagnosis:** Reconstructed the phone screenshot state from the real main-menu rows. Three choices plus a wrapped scenario label fit alongside the title, status, and controller hint within the panel's nine text baselines.
- **Fix:** Limit the selectable window to three choices and add a regression asserting the full “Short scenarios / replace this slot” label, footer presence, and in-panel text bounds.
- **Next time:** Check both width and total wrapped line count against the physical 160×144 panel; a successful line-wrap test alone does not prove a menu fits vertically.
- **Evidence:** `./node_modules/.bin/jest --runInBand --coverage=false --runTestsByPath test/core/browser/game/neonCovenant.test.js` passed (55 tests); `npm run check` passed all 10 gates after rerun with child-process and network permission. The initial sandbox attempt was blocked by `EPERM` when spawning Node and by audit network access.
