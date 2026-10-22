# Grainlands logical-grid renderer

- Unexpected hurdle: the first overflow fixture also placed Mara over the moved geometry, so the renderer's growth-preview validation failed before viewport overflow was evaluated. A later optional-z fixture deleted required spatial bounds and failed the same precondition.
- Diagnosis: use the stack trace and exact fixture line to separate resolver behavior from the growth-preview preflight; canonical growth geometry requires finite increasing bounds on all three axes.
- Chosen fix: keep the overflow geometry away from Mara, move the camera actor outside the authored region to exercise overflow and clamp behavior, and remove the invalid optional-z fixture. The focused evaluator then passed all 27 related suites / 346 tests with all four changed-renderer coverage metrics at 100%, clean ESLint/core-parse, and zero clones.
- Next time: preserve valid simulation fixtures while testing renderer-only overflow; vary actor position and viewport independently so preflight gameplay validation does not mask the layout path. Weftways still needs logical-grid renderer integration.

- Review follow-up: GitHub identified that projected rounding at scale −4 could put Mara one cell beyond the east camera edge during valid movement. The camera now preserves her visibility for actors within the authored boundary (with one-cell projection tolerance), while actors far outside remain overflow. Regression tests cover both region edges; the focused evaluator passed 27 suites / 348 tests with 100% renderer coverage and all static checks passing.
