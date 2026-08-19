# JoyCon action construction mutation slice

- Unexpected hurdle: the handler-shell test did not distinguish the action container from its buttons or verify button order.
- Diagnosis: only form insertion and disposal were observable, so action tags, classes, labels, and the button-array mutation all survived.
- Chosen fix: tracked created element identities, asserted the action/button tags and class/text effects, and verified each button is appended to the action container.
- Evidence: the final Stryker scan for `src/core/browser/inputHandlers/joyConMapper.js:2290-2305` killed all 14 mutants with 0 survivors and 0 timeouts; the focused Jest suite passed 95 tests, targeted ESLint passed with zero warnings, and `git diff --check` passed.
- Next-time guidance: assert both element configuration and child ordering when a shell helper constructs a control group from an array.
