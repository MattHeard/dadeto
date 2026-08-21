# Joy-Con mapper mutation-induced crashes

Date: 2026-08-21

## Symptom

The focused mutation run for `src/core/browser/inputHandlers/joyConMapper.js`
was stopped after repeated Stryker child-process crashes. The run used
`test/core/browser/inputHandlers/joyConMapper.helpers.test.js`, instrumented 876
mutants, and reached 115 of 804 executable mutants before stopping.

## Failure evidence

Mutation of the optional WebHID guards caused uncaught browser API errors:

- The guard around `navigator?.hid` was mutated to access `navigator.hid`,
  producing `TypeError: Cannot read properties of undefined (reading 'hid')`.
- The guard around `hid?.requestDevice` was mutated to call
  `hid.requestDevice`, producing `TypeError: Cannot read properties of
  undefined (reading 'requestDevice')`.

These failures appeared as repeated `ChildProcessProxy` exits with status 1.
They are mutation-induced harness crashes, not survivor results, so the partial
run is not authoritative evidence for the file.

## Diagnosis and follow-up

The focused baseline tests pass, but the fixture does not provide explicit
unsupported-WebHID cases for the guard-removing mutants. Add a focused test
harness/fixture that exercises unavailable `navigator.hid` and unavailable
`hid.requestDevice` safely, then rerun the bounded per-file scan to completion.
Do not mark `joyConMapper.js` complete from the partial run.
