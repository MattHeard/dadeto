# Missing story reference coverage

## What surprised me
- Resolving the option hierarchy without a story ancestor still surfaces the same `TypeError` as the create path.
- I initially expected the failure to come from `createPageContext`, but that helper runs before `ensureDocumentReference` unless we reuse an existing target page.

## How I worked through it
- Traced `resolveIncomingOptionContext` to confirm the order of operations and saw the new context short-circuits when the option already points to a page.
- Built a mock parent chain that stops at the page collection and validated the handler rejects before attempting to generate a new page number.

## Takeaways for future work
- When adding regression tests, double-check the control flow so assertions target the intended guardrail.
- Missing ancestors should be modeled by breaking parent links, not by omitting the target page entirely.
