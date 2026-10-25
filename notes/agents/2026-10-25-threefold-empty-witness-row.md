# Threefold empty witness row coverage

- Unexpected hurdle: The journal formatter supports entries whose presentation fields are blank, but the line-wrapper’s empty-string suppression branch had never been exercised.
- Diagnosis: A saved but empty witness entry has a nonempty ledger count while each optional title/intention/knowledge/consequence formats to no display lines.
- Fix: Added an in-game Field Notes regression with one empty witness entry. It verifies that the menu keeps its Back row, omits the no-notes placeholder, and renders no blank body rows.
- Evidence: Focused coverage in `/tmp/threefold-menu-empty-witness-coverage/coverage-final.json` shows both outcomes at `page.js:631` (`[217,8]`); focused menu Jest passed 15/15. The one-file coverage command returns nonzero only because repository-global 100% thresholds apply. Elevated `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 gates across six impact shards. Spec-cache refresh and `git diff --check` passed.
- Next: Continue the global Full Check coverage task from the newest completed artifact.
