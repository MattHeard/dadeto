# Optional page-reference lookup

The shared lazy selector owns truthiness gating; Promise.resolve normalizes
the selected lookup promise or null to the existing promise-returning boundary.
No falsey page reference should query variants. Lookup rejections retain their
original identity. Do not substitute nullish gating: legacy false/zero/empty
string inputs also skipped the query.

Focused dirty-marking suites pass 63 tests with exact 100% module coverage:
`.tmp/optional-page-tests.log`. Static aggregate fails only duplication43,
down from 44: `.tmp/optional-page-static.log`. Both builds pass:
`.tmp/optional-page-build.log` and `.tmp/optional-page-cloud-build.log`.
No threshold/exemption/ignore additions. Full aggregate follows this batch;
dadeto-aaou and the goal remain active.
