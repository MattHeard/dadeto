# Keyboard capture form context arity cleanup

- Unexpected hurdle: the shared form-ready callback emits one combined context, while the keyboard initializer needs DOM/form placement and controls/lifecycle as separate inputs.
- Diagnosis: keyboard capture setup uses the DOM/form record to find the associated auto-submit checkbox and wire global listeners; button and cleanup list form the mounted-control lifecycle record.
- Fix: `buildKeyboardCaptureFormContext` now accepts these two records and the shared callback maps its full context into them explicitly. Toggle, key forwarding, global listener registration, and cleanup operations are unchanged.
- Evidence: scoped no-cache arity report `.tmp/keyboard-capture-arity-after.json` is empty; keyboard capture handler test passed (1 suite, 4 tests); TSDoc/lint passed; elevated `TMPDIR=/home/matt/dadeto/.tmp npm run check` passed all 10 gates with 0 failures, 0 clones, and 0 audit vulnerabilities. Fresh global inventory `.tmp/parameter-bag-global-after-keyboard-capture.json` reports 31 findings across 31 files, down from 32/32.
- Next time: retain both domain groupings while adapting a callback whose public contract still delivers the combined context. Next target is `src/core/browser/inputHandlers/mobileControls.js:114`.
