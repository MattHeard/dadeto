# Reference assignment-list composition

Strict duplication at `minTokens: 14` found repeated list parsing and persistence wiring across the asset, person and custodian toys. `createReferenceAssignmentList` in `assignmentRequests.js` now composes those operations once; the toy modules supply identifier fields, diagnostic wording and storage policy.

Do not unify the storage policy accidentally: asset lists preserve the raw memory-location option, while person and custodian lists use `referenceMemoryLocation`. Parsing must reject missing assignment identifiers and paths before invoking the memory policy. The dedicated policy regression records that precedence.

Acceptance: `TMPDIR=/home/matt/dadeto/.tmp NODE_OPTIONS=--experimental-vm-modules npx jest --runInBand test/toys/2026-08-20 --coverage --collectCoverageFrom=src/core/browser/toys/2026-08-20/assignmentRequests.js --collectCoverageFrom=src/core/browser/toys/2026-08-20/*AssignmentList.js --coverageDirectory=.tmp/reference-list-coverage`, artifact `.tmp/reference-list-tests.log`. The initial 129-test run passed with all four coverage metrics exactly 100% across all four touched modules.

`npm run check -- --skip-tests` left duplication as its only failure and reduced reported clones from 148 to 144; `.tmp/reference-list-static.log`. No thresholds, exclusions or ignore pragmas changed. The full pre-refactor aggregate `.tmp/mosslight-bugs-check.log` likewise failed only duplication, with exact global 100% coverage. The broader gate-hardening task remains open in dadeto-aaou.
