# Shared numeric clamp

Core `clampNumber` owns the shared bounded calculation used by moderation scoring and GDP projections. Moderation retains its finite-input guard and 0..1 bounds; GDP retains 0..100 bounds and its existing Math/NaN policy. The GDP test-only wrapper remains available.

Direct regression covers below-range, in-range and above-range values, distinct caller bounds, infinities, NaN, positive/negative zero, and exactly one value coercion. No finite-value policy or numeric normalization was added to the shared helper.

Evidence: `.tmp/shared-numeric-clamp-tests.log` records 83 passing tests / six suites and exact 100% coverage in all four metrics for the GDP and moderation modules. Shared-index behavior is tested directly, but the targeted coverage collection does not cover the entire index; use the next full aggregate to prove global/index coverage. `.tmp/shared-numeric-clamp-static.log` records nine passing gates with duplication alone failing at 107 clones, down from 108. Parent goal remains active.
