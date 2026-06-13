# Acceptance: Graph Plotter

## User-visible behavior
- The blog contains a public post for `Graph Plotter`.
- The post uses `GRPH1` and defaults to the `graph-2d` output method.
- The toy returns JSON that the graph presenter can render into a visible `<canvas>`.
- The rendered output includes Cartesian axes and a plotted curve.

## Evidence
- `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/core/browser/presenters/graphPlot.test.js test/toys/2026-06-13/graphPlot.test.js test/browser/toys.setTextContent.graphPlot.test.js test/generator/toyOutputDropdown.test.js test/generator/toyUISections.test.js` passes.
- `npm run build` regenerates `public/blog.json` and `public/index.html` with the public post and `graph-2d` output option.
- `npm test` passes.

## Pass/Fail Rules
- Pass when the graph presenter test, toy test, and generator tests all pass and the generated blog data includes the public post.
- Fail when the output method is missing, the presenter does not create a canvas element, or the graph is not visible on the public site.
