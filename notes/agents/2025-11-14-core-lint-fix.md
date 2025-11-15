## Unexpected hurdles
- The lint run only emitted two non-`complexity` warnings under `src/core`, but they were split between a missing `@returns` description and an unused helper that I initially thought belonged to another module until I parsed the report with file context tracking.
- Adding a descriptive `@returns` entry for `createVerifyAdmin` required describing the returned admin guard to keep the doc useful, while the unused `defaultMissingTokenMessage` constant in `mark-variant-dirty-core` was simply dead code (no references anywhere) so removing it stayed safe.

## What I learned
- When nothing else is broken, lean on the lint report's file-scoped context to confirm what to change and avoid touching the many `complexity` warnings that the user asked not to fix this round.

## Follow-ups
- Monitor future lint reports for `complexity` noise once the team decides how to tame that rule.
