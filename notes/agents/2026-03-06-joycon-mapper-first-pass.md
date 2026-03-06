## joyConMapper first pass

- Unexpected hurdle: the file-level warning bead still mixed two different work types after triage: mechanical JSDoc description gaps and real control-flow complexity.
- Diagnosis path: reduced the handler from 141 to 94 warnings with one bounded pass, then re-ran targeted eslint to inspect the remaining warning families.
- Chosen fix: keep the structural cleanup in this commit and split the remainder into JSDoc-description and complexity follow-up beads instead of widening into a riskier refactor.
- Next-time guidance: pick up `dadeto-jui4` for the remaining description-only warnings first, then `dadeto-lub7` for helper extraction and callback/control-flow flattening.
