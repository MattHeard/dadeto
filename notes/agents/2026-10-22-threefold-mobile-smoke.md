# THREEFOLD narrow-mobile smoke — 2026-10-22

- Unexpected hurdle: the spatial acceptance required a narrow-mobile Broken Gate visual smoke, but no THREEFOLD browser case existed in the configured Playwright suite.
- Diagnosis: the full CI check runs the existing local browser suite after building the site; the Full Check artifact previously omitted screenshots.
- Chosen fix: add a 320×568 Broken Gate Playwright smoke that checks the 160×144 pixelated canvas, visible rendered colors and touch controls, no horizontal overflow, and saves a full-page screenshot. Add that screenshot to the Full Check artifact; local Playwright remains unused.
- Next-time guidance: use the focused Jest renderer tests for cell-level geometry, then inspect the retained browser screenshot and exact-head Full Check result before marking the mobile acceptance item complete.

## Terminal browser evidence

- Exact-head Full Check 39839708353 passed for merged PR #2777. The Full Check artifact 12452857487 includes `threefold-mobile.png` at 320×1748.
- Visual inspection confirms the 160×144 handheld screen, touch controls, and responsive content fit the 320-pixel viewport without horizontal clipping. The acceptance checklist now marks only this smoke complete; the spatial packing and causal gate remains open.
