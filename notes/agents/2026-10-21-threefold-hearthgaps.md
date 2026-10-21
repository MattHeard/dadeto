# THREEFOLD Hearthgaps runoff route

- **Unexpected hurdle:** The first growth regression started Mara inside the home bounds, so scale growth correctly did not count the already-present overlap as new structural damage. The strict clone scanner also caught shared scene-construction and control-object shapes.
- **Diagnosis:** The scale model distinguishes a new growth intersection from a volume already occupied at the smaller scale. The route's two controls also need enough physical separation that the player's initial reach cannot select either by proximity.
- **Fix:** Place the growth case just outside the home at the smaller scale, then verify the expanded body damages it. Build the route using shared geometry/spawn utilities and one control factory. The final focused run passed 20 related suites / 227 tests, all changed-core statement and branch coverage, and zero clones.
- **Next time:** For scale damage tests, choose coordinates using both current and next body bounds. For scene additions, run the exact jscpd evaluator early and extract repeated authored value construction instead of suppressing the clone.
- **Open scope:** Hearthgaps is one bounded region; Weftways, Grainlands, and campaign-wide route/save integration remain separate Rank 3 acceptance work.
