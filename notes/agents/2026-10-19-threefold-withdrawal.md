# THREEFOLD withdrawal branch

- Unexpected hurdle: the first upland-road placement was close enough to trigger during an existing runtime test after Mara grew.
- Diagnosis: the runtime regression showed that the normal action sequence could reach the target; checking the simulation's scale-based interaction radius identified the overlap.
- Chosen fix: moved the road marker northwest, then kept a tested route from the starting gatehouse. Added an in-range route test and an out-of-range interaction test. A subsequent zero-clone check also found duplicated crisis/episode snapshot assembly; consolidated that into `applyCrisisSnapshot`.
- Next-time guidance: when adding a new interaction to shared game geometry, verify its reach at multiple player scales and through existing action sequences, not only from the initial state. The post-storm report and departure epilogue remain separate THREEFOLD work.
- Evidence: seven focused THREEFOLD suites passed (91 tests); `DADETO_CHECK_TIMEOUT_MS=7200000 npm run check` passed all 10 gates and all five fallback shards (956 suites, 6,544 tests), with zero clones; `npm run build` passed. Matching GitHub `check:full` evidence is pending for the pushed commit.
