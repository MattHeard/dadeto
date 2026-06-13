# Graph Plotter Toy

- Hurdle: the first pass only added the toy and presenter logic; the browser bundle also needed a `src/browser/presenters` re-export so the copied public bundle could resolve `graphPlot`.
- Diagnosis: the source `src/browser/toys.js` imports presenter shims from the browser layer, so adding only the core presenter would leave the published browser bundle broken.
- Fix: added the core graph plot helper, the `graph-2d` presenter, the browser re-export, the new toy module, and generator/docs/tests together.
- Next time: when introducing a new presenter-backed toy, verify both the core presenter path and the browser re-export path before running the full site build.
