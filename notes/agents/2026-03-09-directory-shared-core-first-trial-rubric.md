## Trial

- directory: `src/core/browser/inputHandlers`
- bead: `dadeto-hoh6`
- trial focus: decide whether the shared capture-form helpers should move into the directory-named shared module `browserInputHandlersCore.js` or remain in `captureFormShared.js`

## Rubric

- shared/helper placement decision:
  keep `captureFormShared.js` as a narrower concept file instead of forcing those helpers into `browserInputHandlersCore.js`
- where the agent looked first for shared logic:
  `browserInputHandlersCore.js`, then `captureFormShared.js`, then the current `gamepadCapture.js` and `keyboardCapture.js` imports
- obvious vs exploration:
  partially obvious but still required a short inspection pass; the directory-named shared module was the right first stop, but the narrower helper file still had to be read to confirm the concept boundary
- helper-file sprawl effect:
  neutral in file count, but positive in decision clarity; the trial avoided flattening an unrelated helper family into the directory core just to satisfy the convention
- shared-module coherence:
  `browserInputHandlersCore.js` stayed coherent as generic input-handler lifecycle wiring
- directory-splitting pressure:
  mild signal that `inputHandlers` currently contains at least two concepts: generic handler wiring and toy capture-form plumbing
- import predictability:
  improved as a search rule rather than a merge rule; future agents can look in the directory-named shared module first, then treat a surviving narrower helper file as evidence of a real concept boundary instead of an arbitrary exception

## Conclusion

This first trial supports the `directory-shared-core` idea as an exploratory default, not a flatten-everything rule. The main value was predictable search order: check the directory-named shared module first, and if moving a helper there would make it less coherent, keep the narrower concept file and treat that pressure as evidence for a future directory split.
