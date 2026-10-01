# Mosslight viewport and HUD

The 160px canvas rendered only twelve 12px terrain columns, leaving a 16px
strip. Both presenters now consume shared terrain shapes: thirteen complete
columns and a clipped partial fourteenth, with an opaque background for small
maps. Camera width remains thirteen so the last map column and player stay
fully visible at the right boundary.

HUD labels previously exceeded the logical canvas width. Both presenters now
share four 7px monospace rows for location/time, memory/objective, and a two-row
message. Oversized labels and messages have explicit ellipses. Dialogue retains
its existing 28-column layout.

Regression evidence lives in mosslightRenderer.test.js (authored maps, camera
edges, long labels/messages and presenter parity) and mosslight-e2e/hud.spec.ts
(actual browser text measurements and opaque right-edge pixels on phone and
desktop, embedded and dedicated). Focused tests: 36 passed; renderer statements,
branches, functions and lines: 100%. Build passed. Full gate and browser evidence
will be appended after terminal results.

Use TMPDIR=/home/matt/dadeto/.tmp for Jest and Playwright: the default /tmp Jest
cache can exhaust the small tmpfs. Do not stage Playwright's temporarily deleted
test-results/.last-run.json while a browser run is active.
