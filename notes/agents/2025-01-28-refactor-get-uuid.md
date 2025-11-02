# Notes on reducing getUuid complexity

- eslint's complexity rule flagged `getUuid` even though it was a single return statement. The optional chaining and `||` chain apparently counts toward cyclomatic complexity, so relying on the lint report helped confirm the score.
- Extracting the normalization into `readUuidCandidate` meant juggling the `no-ternary` rule—ternaries reintroduced warnings. Keeping the helper procedural with early returns satisfied the rule while still trimming whitespace once.
- Iteratively running `npm run lint` exposed how auto-fixes can spill over to unrelated files. Reverting those after each run kept the diff focused and avoided accidental style churn.

Next time, start with a helper that encapsulates both sanitization and source selection so the entry-point function stays small without triggering style rules.
