# Non-Core Thin Size Ten Checkpoint

- Unexpected hurdle: moving four under-tested adapters into `src/core` reduced the non-core size count but pulled their implementation branches into the 100% coverage gate.
- Diagnosis path: `npm run non-core-thin` confirmed the size count dropped from 15 to 10, then `npm run check` showed the introduced fallout: coverage, TSDoc/lint, and two duplication clones.
- Chosen fix: keep the size-reduction checkpoint explicit and leave the bead open rather than claiming the full quality loop is complete.
- Next-time guidance: prefer extracting only code with existing core coverage, or pair each non-core-to-core extraction with characterization tests and shared parser-option helpers in the same loop.
