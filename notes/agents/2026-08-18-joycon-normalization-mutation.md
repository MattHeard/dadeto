# JoyCon stored-state normalization mutation slice

- Unexpected hurdle: the broad scan included three `NoCoverage` mutants outside the directly reachable normalization branches.
- Diagnosis path: the scan over `joyConMapper.js:845-892` found four behavioral survivors in object and payload normalization; a focused rerun over `862-892` isolated the reachable set.
- Chosen fix: tested `isObjectLike` directly and covered primitive, array, object, valid mapping, and invalid skipped-control payloads.
- Evidence: the final bounded Stryker run killed all 18/18 mutants in `862-892`; focused Jest and targeted ESLint passed.
- Next-time guidance: use narrow ranges around the reachable branch when Stryker reports `NoCoverage` mutations from adjacent declarations.
