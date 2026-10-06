# Chronoflow solver-driven flow visuals

- Unexpected hurdle: the solver stores velocity components but the board exposed only water depth, so moving water looked like a static heatmap.
- Diagnosis: verified the solver convention in `chronoflow.js` (positive horizontal is right; positive vertical is down) and characterized all four directions, ties, still-water threshold, and strength cap in a pure render helper.
- Fix: add deterministic flow-direction/glyph data to each cell and a CSS-only water shimmer that respects reduced-motion settings. Visual animation does not advance or mutate solver state. Accessible cell labels include motion.
- Next-time guidance: continue deriving visible data from immutable solver snapshots; keep CSS/frame timing presentation-only. Add pressure/velocity and tide cues as separate readable HUD data before increasing simulation complexity.
- Evidence: focused Chronoflow Jest 26/26; local Playwright Chronoflow 2/2 with visible downward-flow marker; `TMPDIR=/home/matt/dadeto/reports/tmp npm run check` terminal status passed, total=10 failed=0; coverage lines 22207/22207, statements 23240/23240, functions 7482/7482, branches 12085/12085; jscpd 0 clones; `git diff --check` passed.
