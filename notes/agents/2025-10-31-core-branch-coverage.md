## Core branch coverage lift

- Added branch-focused Jest cases for the moderation authed fetch helper, the API key credit handler, and the remove-variant HTML utility so every guarded path is executed under test.
- Exercised the write-formatted-HTML generator in both success and failure flows, including default parser/config handling, to guarantee the fallback branch stays covered.
- Confirmed the expanded suites drive `src/core/**` branch coverage to 100% with `npm test` and documented lingering lint noise from legacy complexity rules.
