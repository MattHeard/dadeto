# JoyCon control-advancement mutation slice

- Unexpected hurdle: `advanceToNextControl` was covered only through capture workflows.
- Diagnosis path: the bounded scan over lines 1730-1737 found three survivors in callback selection and completion-state assignment.
- Chosen fix: asserted advancement to the next pending control and the no-later-control completion state directly.
- Evidence: the verification scan killed all 3 mutants; focused Jest, targeted ESLint, and diff checks passed.
- Next-time guidance: test transition helpers at both normal progression and terminal boundaries.
