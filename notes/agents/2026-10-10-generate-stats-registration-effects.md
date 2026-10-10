# Generate-stats startup registration effects

- Unexpected hurdle: the cloud handle factory had a second composition layer, so injecting adapters into the route builder alone did not forward them from createGenerateStatsHandle.
- Diagnosis path: inspected src/cloud/generate-stats/index.js through src/core/cloud/generate-stats/run.js, then used the run helper's focused tests to validate adapter injection and fresh startup permissions.
- Chosen fix: add permission-first cloud adapters for CORS middleware and POST route registration; bind a separate startup AllowEffects token for each operation and thread both adapters through the public handle factory.
- Evidence: node --experimental-vm-modules ./node_modules/.bin/jest --runInBand --runTestsByPath test/core/cloud/generate-stats/run.test.js test/cloud/generate-stats/effect-adapters.test.js passed 2 suites / 15 tests; strict ESLint passed; npm run tsdoc:check passed; npm run build:cloud passed; TMPDIR=/home/matt/dadeto/.tmp npm run check passed all 10 gates. Coverage artifact reports 100% statements, branches, functions, and lines; local E2E passed 11/11.
- Open effects for follow-up: createJsonExpressApp still directly registers JSON/urlencoded middleware; generate-stats initializes Firebase in the core composition helper; request handlers directly write HTTP responses and log errors. These are not covered by this bounded registration slice.
- Next-time guidance: update every injected adapter at both runGenerateStats and createGenerateStatsHandle; the latter forwards runtime dependencies into the former.
