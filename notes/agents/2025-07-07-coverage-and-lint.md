## Summary
- Ensured Jest coverage for `src/core/` hit 100% branches by adding targeted tests for duplicate Firebase init handling and admin action validation guards.
- Addressed lint output by removing a ternary usage in the admin trigger result reporter, documenting the change for future iterations.

## Challenges
- Accessing the internal `createAdminTokenAction` helper required exposing a test-only export to exercise its validation branch.
- Achieving full coverage demanded multiple long-running Jest suites; rerunning them after each adjustment was time-consuming but necessary to confirm results.
