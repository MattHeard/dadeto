# 2026-03-31 three-more-toy-globs branch-100 follow-up

- **Unexpected hurdle:** Re-enabling three toy-related globs dropped branch coverage due two dead guards in `browserToysCore`, an unused placement helper in battleship fleet, and one untested STAR1 fallback branch.
- **Diagnosis path:** Removed the globs, queried `coverage-final.json` for uncovered branch IDs, and mapped misses to line-level helpers.
- **Chosen fix:** Removed unreachable guards/helpers and added a focused legacy-fallback test for `startLocalDendriteStory` when `STAR1` is empty but `DEND1` has data.
- **Next-time guidance:** Use coverage JSON branch maps directly to target tiny missed helpers before adding broader integration tests.
