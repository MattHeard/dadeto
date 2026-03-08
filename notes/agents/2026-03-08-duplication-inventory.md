# 2026-03-08: duplication inventory from current jscpd report

- Bead: `dadeto-gke1`
- Scope: turn the current `jscpd` artifact into a planner-usable duplication inventory in the duplication-zero project note.
- Change:
  - updated `projects/duplication-zero/notes.md` with the active artifact timestamp, `minTokens` setting, active clone families, and one likely next implementation slice
  - kept the summary short and artifact-driven instead of creating a separate broad duplication document
- Validation:
  - direct inspection matches `reports/duplication/jscpd-report.json`
  - `npm test` passed with `468` suites and `2306` tests
- Follow-up:
  - the smallest next high-signal slice is the short `2026-03-01` toy/helper clone family; the larger `gamepadCapture` ↔ `keyboardCapture` family should stay as its own dedicated refactor bead
