# Chronoflow selected-cell inspection

- Unexpected hurdle: the simulation had volume, velocity, and pressure-head inputs, but players could not inspect what the solver was doing inside an individual channel.
- Diagnosis: matched the head display to the solver's face-flux formula: normalized water depth plus grid row, with positive vertical direction down.
- Fix: added a pure cell-readout projection and accessible selected-cell panel for depth, hydraulic head, velocity vector, and terrain; cell buttons expose selected state and retain flow arrows.
- Next-time guidance: add tide-window gameplay as an explicit layer over the unchanged deterministic solver; clock reads must continue to arrive only as injected trusted samples.
- Evidence: selected-cell Jest/presenter tests pass; local Playwright selects a flowing cell; `TMPDIR=/home/matt/dadeto/reports/tmp npm run check` terminal status passed, total=10 failed=0; coverage lines 22221/22221, statements 23254/23254, functions 7484/7484, branches 12094/12094; jscpd 0 clones; `git diff --check` passed.
