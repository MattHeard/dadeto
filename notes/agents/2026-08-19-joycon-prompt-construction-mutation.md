# JoyCon prompt construction mutation slice

- Unexpected hurdle: both prompt labels are written again by the first render, which allowed constructor text mutations to survive ordinary label assertions.
- Diagnosis: the handler-shell test did not observe the prompt and subprompt elements individually.
- Chosen fix: tracked created element identities, asserted the exact prompt/subprompt tags and class names, and required four initial-plus-render text writes across the two labels.
- Evidence: the final Stryker scan for `src/core/browser/inputHandlers/joyConMapper.js:2282-2289` killed all 8 mutants with 0 survivors and 0 timeouts; the focused Jest suite passed 95 tests, targeted ESLint passed with zero warnings, and `git diff --check` passed.
- Next-time guidance: preserve element identity and assert repeated initialization/render writes when static shell text is immediately refreshed.
