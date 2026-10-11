# Capture form context arity cleanup

- Unexpected hurdle: `getCaptureFormContext` was wrapped by `withCaptureFormContext`, so changing only the inner helper would have left the same combined five-field bag crossing the shared boundary.
- Diagnosis: DOM/form placement (`dom`, `container`, `textInput`) and mounted controls/lifecycle (`button`, `cleanupFns`) are independent records consumed together to form CaptureFormContext.
- Fix: both helpers now accept those two records explicitly; keyboard and gamepad adapters pass the same grouped context while preserving the callback payload and initial button reset.
- Evidence: scoped no-cache arity report `.tmp/capture-form-arity-after.json` is empty; focused capture-form, keyboard, gamepad, and lifecycle mutation suites passed (4 suites, 45 tests); TSDoc passed; elevated `TMPDIR=/home/matt/dadeto/.tmp npm run check` passed all 10 gates with 0 failures, 0 clones, and 0 audit vulnerabilities. Fresh global inventory `.tmp/parameter-bag-global-after-capture-form.json` reports 33 findings across 33 files, down from 34/34.
- Next time: follow the input record through every wrapper before changing a shared helper signature. Next target is `src/core/browser/inputHandlers/joyConMapper.js:2380`.
