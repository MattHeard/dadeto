# THREEFOLD Grainlands nursery and spider

## Unexpected hurdle

The first focused command included the static HTML path, which the impact selector does not support and therefore triggered an all-unit fallback; it was stopped and the page test was used to cover that HTML instead. The first implementation runs then found a missing simulation type guard, a statement-count increase in save restoration, and an optional-scale JSDoc lint rule. Once those were fixed, focused regressions showed the spider lacked the explicit overlap growth rule and the physical bridge/spider bounds began just outside the proposed grown body. A subsequent run caught validation happening before the bridge break was recorded.

## Diagnosis path

I traced the failed case through `previewThreefoldGrowthEffects`, `previewGrowthOverlapIds`, and `bodyBoundsAtScale`. At scale −3, the body half-width is about 7.4 mm; after one growth rung it is about 22.2 mm. With Mara at x = 0.2 m, the encounter volumes must start between those right edges for the current body to clear them and the next body to overlap them. The successful fixture uses x = 0.21 m and marks the spider `growthRule: overlap`. I also inspected save schema dispatch, route clock, page selection, and the Mosslight grid renderer.

## Chosen fix

Added a separate scale −3 Grainlands route, Iru, a Nursery Clades shelter with eggs, an 18 cm spider, and a Threadbound bridge. E helps Iru bait the spider away; A grows Mara to −2, overpowers the spider, and breaks the bridge using the same physical preview/commit collision rules. Added route-isolated schema-v1 save/export/import, explicit route time, the shared snapped renderer, sequential route links, page copy, tests, and durable harness/manual/acceptance coverage. Save scene flags are grouped to keep restoration below the configured statement limit. The final focused evaluator passed 23 related suites / 273 tests, with 100% statement and branch coverage for every changed core file and zero clones.

## Next-time guidance

Before writing a scale-growth fixture, compute both physical body bounds from `baseBodyWidthMeters * 3 ** scale`, and mark creatures with their intended growth rule. When route-state invariants depend on more than one physical consequence, commit the geometry first and normalize the coupled branch state afterward. Keep unsupported static paths out of the focused evaluator and cover them through the page suite that reads them.
