# Realtime voice presenter coverage

- Target: `src/core/browser/presenters/realtimeVoicePrototype.js`
- Evidence: `npx jest test/browser/presenters/realtimeVoicePrototype.test.js --runInBand --coverage --collectCoverageFrom=src/core/browser/presenters/realtimeVoicePrototype.js --coverageThreshold='{"global":{"statements":100,"branches":100,"functions":100,"lines":100}}'`
- Result: 1 suite and 5 tests passed; statements, branches, functions, and lines each reached 100% without exclusions.
