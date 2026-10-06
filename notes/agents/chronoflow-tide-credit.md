# Chronoflow trusted tide credit

- Unexpected hurdle: the existing level completed independently of its Internet tide display, and the aggregate coverage report rounded one missed presenter branch to 100%.
- Diagnosis: traced the first target-fill transition through the presenter and solver, then inspected `coverage-summary.json` and `coverage-final.json` rather than trusting the rounded gate summary.
- Fix: evaluate timed credit once at that transition using the fresh injected clock reading; only synchronized high tide earns the record. Other phases and stale/offline clocks complete as practice. Added phase and presenter coverage, browser E2E, and clarified the manual.
- Next-time guidance: keep puzzle completion independent of timed credit. Add authored route choices and more expressive player controls as the next gameplay milestone. Inspect exact coverage numerators after every green aggregate.
- Evidence: focused Chronoflow Jest 17/17; local Playwright Chronoflow 2/2; `TMPDIR=/home/matt/dadeto/reports/tmp npm run check` terminal summary passed (10/10); coverage-summary reports lines, statements, functions, and branches all exactly 100%; `npm run duplication` reports 0 clones; `git diff --check` passed.
