# Test Coverage Deep Dive 2025-11-19

- Running the existing `submit-new-story-core` suite while hunting for the last uncovered lines tripped the usual watchman error (`unable to talk to your watchman...`). Workaround: run the targeted suite with `npx jest ... --watchman=false` so I could see exactly what helpers were missing from coverage.
- Several internal helpers (`isSnapValid`, `getRequestBody`, `normalizeCorsOptions`) were never exported, so the new sanity checks I wrote could not execute the uncovered branches. Exporting them allowed direct unit tests (and the broader suite) to exercise the previously unseen code paths.
- Following the targeted fixes, rerunning `npm test` produced the full 100% coverage snapshot. Reminder for future agents: adding coverage-specific exports is acceptable when the helpers are purely internal/utility-level, but double-check you don’t break the public API.

Open questions: none beyond the usual keep-watchman-disabled caution whenever directly invoking individual suites.
