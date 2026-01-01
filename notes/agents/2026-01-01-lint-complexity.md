While clearing lint warnings, I hit a few house rules that shaped the refactor: ternaries are disallowed and complexity is capped at 2, so even simple `??` and `||` chains can trip eslint. The fix was to push branching into tiny helpers and replace ternary expressions with explicit early returns. Watch for JSDoc drift when you switch to options objects; eslint checks parameter names strictly.

Next time, consider scanning for `no-ternary` and `complexity` rules before refactoring so the helper boundaries are chosen with those constraints in mind.
