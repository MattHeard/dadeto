# Acceptance: GDP Sector Projection

## User-visible behavior
- The toy accepts annual GDP share rows for primary, secondary, and tertiary sectors.
- The rendered output shows three series on a Cartesian graph.
- The graph covers 2000 through 2050.
- The projection reaches primary = 0 by 2030, secondary = 0 by 2035, and tertiary = 100 by 2035, then stays flat through 2050.

## Evidence
- `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/core/browser/presenters/graphPlot.series.test.js test/toys/2026-06-14/gdpSectorProjection.test.js` passes.
- `npm test` passes.
- `npm run check` passes.

## Pass/Fail Rules
- Pass when the toy test and presenter test both pass and the plotted payload includes three series with the requested projection endpoints.
- Fail when the graph presenter only renders a single series, the projection targets are wrong, or malformed input crashes the toy.
