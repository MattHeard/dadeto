# Retrospective: include tsdoc in aggregate check gate

- **Unexpected hurdle:** The quality docs still describe `tsdoc:check` as intentionally out of the default aggregate gate, so script and docs are now potentially out of sync.
- **Diagnosis path:** Confirmed the current `check` script in `package.json` and updated only the aggregate command to include `npm run tsdoc:check` after existing local gates.
- **Chosen fix:** Added `npm run tsdoc:check` into `npm run check` so type/doc validation runs as part of the default gate.
- **Next-time guidance:** If this policy change is intentional long-term, update `docs/quality/definition-of-done.md` and `docs/quality/evaluator-matrix.md` in the same loop to avoid policy drift.
