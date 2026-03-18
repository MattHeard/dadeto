Unexpected hurdle: the nearest test path in the bead was stale, so I had to locate the real keyboard capture handler test file first.

Diagnosis path: inspected `src/core/browser/inputHandlers/keyboardCapture.js`, then found the actual coverage file at `test/browser/inputHandlers/keyboardCaptureHandler.test.js`.

Chosen fix: added one focused test that fires `keydown` before capture is enabled and asserts `preventDefault` is not called and the payload stays unchanged.

Next-time guidance: when a bead cites a test path, confirm the current file tree before patching so the loop stays bounded.
