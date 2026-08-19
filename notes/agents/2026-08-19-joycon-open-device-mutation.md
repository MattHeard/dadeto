# JoyCon open-device mutation coverage

- Hypothesis: opening a granted device must preserve uniqueness, track it, and emit the connected lifecycle event.
- Evidence: guard branch (`301–305`) killed 4/4 mutants; opening/tracking branch (`306–316`) killed 5/5 with 0 survivors and 0 timeouts.
- Focused Jest (85/85), targeted ESLint, and diff checks passed.
