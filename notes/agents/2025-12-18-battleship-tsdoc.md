### Battleship Fleet TSDoc cleanup
- Ran the `tsdoc:check` sweep and found the presenter was drowning in implicit `object`/`any` types; adding a small set of `@typedef`s (crew, board info, dom helper) let TypeScript understand the data shape, which knocked down the bulk of the `battleshipSolitaireFleet.js` errors.
- While wiring the new helpers I had to expand the validator helper to avoid the ternary ESLint warning, which revealed a lingering lint rule (`no-ternary`) that now has a natural `if`/`return` alternative.
- The remaining `tsdoc` failure count is still very high because the rest of the core/browser/core files lack typedef coverage; I didn’t attempt to fix them this pass but noted the gap.
- Next time it might be worth defining shared presenter type heads so each toy file can reuse them instead of repeating `object` everywhere; that could also let us convert more helpers to real TypeScript files later.
- Open question: Should we invest in a shared presenter typedef catalog (or even migrate these presenters to `.ts`) so `tsdoc:check` can surface fewer warnings without retyping each toy?
