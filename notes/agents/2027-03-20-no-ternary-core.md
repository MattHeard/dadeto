# 2027-03-20 No Ternary Core

## Challenges
- Needed to satisfy the "no-ternary" lint rule inside `src/core/cloud/hide-variant-html/core.js` without altering behavior. The helper receives multiple result shapes, so the existing ternary expressions embedded subtle nullish fallbacks.

## Resolutions
- Replaced the nested ternaries with explicit conditional assignments that first assume defaults and then refine them when loader results provide extra fields. This kept the null-handling intact while aligning with the lint rule.
