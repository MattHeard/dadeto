# Joy-Con controller-state mutation slice

- Diagnosis: controller helper behavior needed explicit coverage for connected gamepads, HID precedence, HID-only connections, empty devices, and absent device lists.
- Fix: exposed `currentPad`, `currentHidSnapshot`, `currentControllerSnapshot`, and `hasConnectedController` through the existing test-only surface and added focused behavioral assertions.
- Evidence: bounded Stryker run for `joyConMapper.js:154-191` killed 14/14 mutants with 0 survivors and 0 timeouts; focused Jest passed 12/12; lint and `git diff --check` passed.
- Next time: continue with the next small Joy-Con mapper range using serialized workers.
