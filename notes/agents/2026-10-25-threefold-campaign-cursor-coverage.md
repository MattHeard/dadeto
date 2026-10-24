# Threefold campaign cursor clamp coverage

- Unexpected hurdle: The single-file coverage invocation reports global coverage below the repository-wide 100% threshold even when the focused test passes.
- Diagnosis: The campaign menu can lose saved place rows while its cursor is positioned on a later row; `facade.frame()` must clamp that cursor to the last remaining item.
- Fix: Added a controller-only regression that opens Campaign with eight places, advances the cursor, removes the saved locations, and verifies the remaining Back item is selected after rendering.
- Evidence: Focused menu Jest passed 13/13. `/tmp/threefold-menu-cursor-coverage/coverage-final.json` shows both outcomes at `page.js:650` (`[1,28]`). The focused command's overall status is nonzero solely because it applies project-wide 100% coverage thresholds to one file. Elevated `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 gates across six impact shards. Spec-cache refresh and `git diff --check` passed.
- Next: Continue the global coverage inventory from exact-head Full Check artifacts; do not change thresholds or exclusions.
