# Copy Complexity Reflection

- **Unexpected hurdle:** Pulling the declared-file guard into a helper repeatedly resurfaced new ESLint complexity warnings (including `no-ternary`, optional chaining, and boolean branches) because the rule is tuned very aggressively. I ended up splitting the logic into three narrow helpers—one to extract the list, one to check for a non-empty array, and one to tie them together—so each function only has a single decision point and the rule is satisfied while keeping the behavior unchanged.
- **What I learned:** With a 2-branch limit, every helper needs to avoid `&&`, `||`, and `?:` and only expose one `if` or a pure expression. When dealing with these warnings, break the condition apart rather than trying to capture everything in one helper; that keeps downstream code readable while keeping lint happy.
- **Commands:** `npm run lint` (pre- and post-refactor, including the latest fix) and `npm test` (coverage run).
- **Follow-up idea:** If we keep hitting this ceiling, consider revisiting the complexity threshold for these core helpers or documenting a helper-pattern checklist so future agents know how to craft guards that stay within the limit.
