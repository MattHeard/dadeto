# Submit-shared coverage

- Unexpected hurdle: the existing suite covered request/header normalization but not the shared response dispatch or handler factory.
- Diagnosis: strict Jest coverage identified lines 179-279 as uncovered in `src/core/cloud/submit-shared.js`.
- Fix: added focused tests for JSON, status-only, primitive responses, request normalization, cloud handler creation, and responder validation.
- Evidence: `npx jest test/core/cloud/submit-shared.test.js test/core/cloud/submit-shared.coverage.additional.test.js --no-cache --watchman=false --runInBand --coverage --coverageProvider=babel --coverageReporters=text --collectCoverageFrom=src/core/cloud/submit-shared.js` reports 100% statements/branches/functions/lines.
- Next time: when a shared wrapper has a broad uncovered range, test each response-shape dispatch and invoke the factory-generated handler directly.
