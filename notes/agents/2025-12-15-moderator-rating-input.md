## Unexpected friction
- Adding the custom `moderator-ratings` input handler meant more ripple effects than I expected. The new dropdown option had to be reflected in multiple generator tests (`toyUISections`, `generator`, and the full-HTML mutant suite) plus the input handler map source test, so I spent time hunting down each hard-coded string/regex instead of just wiring up the handler itself.
- Because the generator tests assert enormous HTML strings, `apply_patch` kept choking when I tried to insert the new option, so I ended up scripting the replacement for that long template literal. That was the fastest path, but it reminded me to expect brittle test fixtures whenever I tweak fundamental UI markup.
- The handler also had to clean up after itself via `_dispose`, so I kept advisors on event listeners, removals, and stored state. It work, but it was a reminder that every new “special” input needs careful cleanup plumbing so the dropdown can switch back and forth without leaking listeners or stale DOM.

## Lessons
- When a toy introduces a new input method, also scan every generator test that embeds the `<select class="input">` markup. The value list is centralized in `INpuT_METHODS`, but several tests still assert the rendered string, so it is worth updating them at the same time as the handler.
- Predefining normalization helpers (`normalizeRatingEntry` / `serializeRatingRows`) made it easier to keep the hidden JSON, DOM inputs, and tests aligned. Keeping those helpers small and exportable meant the unit tests could exercise just the schema logic without bringing along DOM wiring.

## Follow-ups
- Should we ever expose the `moderator-ratings` builder to other toys, or keep it locked to this one? If so, maybe the generator should generate the option list from metadata so tests no longer need string literals for every new method.
