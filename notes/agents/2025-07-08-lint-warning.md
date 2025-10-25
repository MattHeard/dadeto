# Lint warning fix

- Challenge: Linter flagged ternary expressions in `src/core/cloud/get-api-key-credit-v2/core.js` which violated the `no-ternary` rule.
- Resolution: Replaced the ternaries with equivalent conditional blocks and reran ESLint to confirm the warnings were resolved for those lines.
