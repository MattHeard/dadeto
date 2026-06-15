# Failure Modes: GDP Sector Projection

## Initial Predicted Failure Classes
- Setup/configuration mismatch:
  - The presenter still assumes only one line of points.
- Input contract drift:
  - Forecast overrides are ignored or rejected.
  - The toy no longer falls back to the committed public data snapshot.
- Invalid or missing inputs:
  - JSON is malformed or rows omit year or sector fields.
- Dependency/service unavailable:
  - Canvas 2D context is missing in the browser or test DOM.
- Non-deterministic timing or ordering:
  - The input rows are unsorted and must be sorted before plotting.
- Environment-specific behavior:
  - The graph is rendered but axis scaling makes the projection hard to read.

## Detection Signals
- Error signatures/log lines:
  - `Cannot read properties of undefined` while parsing rows.
  - `getContext` returns `null`.
  - Only one series appears in the output payload.
- Observable symptoms:
  - Changes to `forecast` have no effect on the output.
  - The 2000 through 2024 trend window is empty when no rows are supplied.
- Observable symptoms:
  - Missing projection line after 2025.
  - Primary and secondary do not reach zero at the requested years.
- Failing command(s):
  - `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/core/browser/presenters/graphPlot.series.test.js test/toys/2026-06-14/gdpSectorProjection.test.js`

## First-Response Playbook
1. Confirm the toy is producing a `graph-plot` payload with a `series` array.
2. Verify the presenter draws each series independently.
3. Check that the projection rules use 2030, 2035, and 2050 as the default endpoints and that overrides still flow through.
4. Check that the public historical snapshot loads when the input omits `rows`.

## Promoted from Real Failures
- Date:
- Failure observed:
- Root cause:
- Fix implemented:
- Guardrail added (test/doc/harness):
