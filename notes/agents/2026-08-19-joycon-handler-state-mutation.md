# JoyCon handler state-object mutation slice

- Unexpected hurdle: the initial `started` and `hidDevices` values were not observable while the shell test used only a disconnected controller state.
- Diagnosis: a connected-controller render distinguishes `started: false` from the Boolean mutant, while a reset with no controller distinguishes an empty HID-device array from the injected mutant value.
- Chosen fix: exercise the handler with a connected gamepad to assert the ready prompt, then invoke the registered reset handler after disconnecting it and assert the mapper returns to the disconnected prompt.
- Evidence: the final Stryker scan for `src/core/browser/inputHandlers/joyConMapper.js:2317-2338` killed all 3 mutants with 0 survivors and 0 timeouts; the focused Jest suite passed 95 tests, targeted ESLint passed with zero warnings, and `git diff --check` passed.
- Next-time guidance: vary external input state across initialization and reset paths when object-literal fields are only visible through downstream rendering.
