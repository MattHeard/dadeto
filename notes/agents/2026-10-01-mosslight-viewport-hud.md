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
is recorded below.

Final acceptance: TMPDIR=/home/matt/dadeto/.tmp npm run check exited 0;
npm test and all ten static gates passed. Repository lines, statements,
functions and branches all reached 100%. Log: /tmp/dadeto-hud-check-final.log;
coverage: reports/coverage/coverage-summary.json. npm run build passed
(/tmp/dadeto-hud-build-final.log). Playwright using
test/mosslight.playwright.config.ts --workers=1 passed 15 tests with three
intentional device-specific skips (/tmp/dadeto-hud-playwright-final.log).
Screenshots: /tmp/dadeto-hud-phone-embedded.png and corresponding page/desktop
variants. Duplication: zero clones, no suppression. The first aggregate run
caught max-depth in the nested clipping loop; an early map-bounds continue
removed that nesting. Source checkpoint f8f776de6f deployed successfully via
Netlify workflow 36926878701; live renderer was verified after the initial
deployment as well.

Use TMPDIR=/home/matt/dadeto/.tmp for Jest and Playwright: the default /tmp Jest
cache can exhaust the small tmpfs. Do not stage Playwright's temporarily deleted
test-results/.last-run.json while a browser run is active.
