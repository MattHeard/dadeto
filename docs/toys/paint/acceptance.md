# Paint — acceptance

Run `node scripts/run-jest.js --runInBand test/core/browser/presenters/paint.test.js`. Verify pointer coordinate scaling, capture, cancellation, tool changes, clearing and full viewport toggling without bitmap resets. Run `npm run check` and `npm run build`.

Cloud Playwright: `test/e2e/paint-layout.spec.ts` checks actual canvas bounds in portrait and landscape, expansion when Controls collapses, and unchanged bitmap pixels across toggles and rotation.
