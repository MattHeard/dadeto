# Memory Vector Clone Extraction

- Unexpected hurdle: the first helper extraction fixed the duplication report, but it left a hidden coverage hole in `memoryVector.js`.
- Diagnosis: the missing branches were the default-argument paths on the new shared helper layer, not the functional projection logic.
- Fix: added a focused helper test that calls the shared memory-vector functions without override objects, and exposed the minimum test-only surface needed to reach the defaults.
- Next-time guidance: when extracting common logic into helper layers, add at least one test that exercises the default path as well as the override path so branch coverage does not drift.
