# Acceptance: GDP Sector Projection

## User-visible behavior
- The toy accepts annual GDP share rows for primary, secondary, and tertiary sectors.
- The toy also accepts an optional `forecast` object that can override the projection years and tertiary target.
- When rows are omitted, the toy uses committed public historical data for 2000 through 2024.
- The rendered output shows three series on a Cartesian graph.
- The graph covers 2000 through 2050.
- The default projection reaches primary = 0 by 2030, secondary = 0 by 2035, and tertiary = 100 through 2050.

## Evidence
- `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/core/browser/presenters/graphPlot.series.test.js test/toys/2026-06-14/gdpSectorProjection.test.js` passes.
- `npm test` passes.
- `npm run check` passes.
- `src/core/browser/toys/2026-06-14/gdpSectorProjection.publicRows.js` contains the committed historical snapshot.

## Pass/Fail Rules
- Pass when the toy test and presenter test both pass and the plotted payload includes three series with the requested projection endpoints.
- Fail when the graph presenter only renders a single series, the projection targets are wrong, malformed input crashes the toy, or the toy stops honoring forecast overrides and the public data fallback.
