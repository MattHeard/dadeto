# Chronoflow junction route choice

- Unexpected hurdle: the original board had one passable route, so opening the sluice was the only meaningful player action.
- Diagnosis: mapped the 5 by 4 grid and found the junction can fork into an archive channel and a lower decoy drain without changing the solver dimensions or equations.
- Fix: added an explicit route command that opens one branch and blocks the other; the decoy applies a deterministic drain while archive selection enables the sluice. Reset restores the decoy route. Added accessible control, offline completion E2E, conservation behavior, and updated the manual/spec.
- Next-time guidance: keep route selection at the runtime/presenter boundary and leave fluid stepping clock-free. The next useful slice is to make fluid depth and velocity visible as smooth water motion without changing fixed-step solver state.
- Evidence: focused Chronoflow Jest 17/17; local Playwright Chronoflow 2/2 including high-tide credit and offline practice completion; `TMPDIR=/home/matt/dadeto/reports/tmp npm run check` terminal status passed, total=10 failed=0; coverage reports lines 22192/22192, statements 23225/23225, functions 7480/7480, branches 12069/12069; `npm run duplication` reports 0 clones; manuals validated 77; `git diff --check` passed.
