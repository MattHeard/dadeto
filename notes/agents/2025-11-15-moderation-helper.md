## Unexpected hurdles
- The responder’s main branch was still embedded inside the `else` block after the missing-token guard, so the token extraction logic wasn’t reusable and slightly bloated the function.

## What I learned
- Extracting `resolveTokenFromRequest` and `handleAuthorizedRequest` makes the responders’ entry point simpler and keeps the authorized workflow testable; it also keeps the early-return guard easy to spot, which should make future complexity reductions less painful.

## Follow-ups
- If the complexity rule is ever relaxed, consider collapsing the helper back in, but for now these helpers keep the authenticated path readable.
