## Hurdle

Threading `dom.globalThis` through the browser input handlers broke the test scaffolds because several mocked `dom` helpers did not expose a `globalThis` property.

## Diagnosis

The full `npm test` run isolated the breakage to the input-handler tests in sequence:

- `keyboardCaptureHandler.test.js`
- `gamepadCaptureHandler.test.js`
- `joyConMapperHandler.test.js`

Each failure came from code that now read browser APIs from `dom.globalThis` while the test helper still returned a DOM facade without that property.

## Fix

Added `globalThis` to the shared DOM helper typedef and routed browser-global reads in the capture/dendrite/mapper handlers through `dom.globalThis`. Updated the affected input-handler test DOM mocks to expose `globalThis` so the tests observe the same API surface as production code.

## Next Time

When moving browser dependencies behind `DOMHelpers`, update the test `makeDom()` helpers in the same loop. The fastest validation is a full `npm test` run, because each input-handler suite has its own local DOM mock.
