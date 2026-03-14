# TSDoc Zero

## Outcome

Reduce Dadeto `npm run tsdoc:check` failures to zero and keep them at zero through future changes.

## Priority

- MoSCoW: Should have. The typed-JS contract surface matters, but it is secondary to the operator/trust work.
- RICE: High impact on code confidence with medium reach; the project is well suited to incremental file-local beads.
- Cost of Delay: High. Unclear or broken type contracts spread confusion and make later cleanup less local.

## Current state

`npm run tsdoc:check` still fails across several browser/input-handler and toy surfaces, but the recent `dadeto-814r` slice removed the `joyConMapping`-owned failures. The next active front of the project is now `src/core/browser/inputHandlers/gamepadCapture.js`, with `dadeto-lvu1` targeting the current smallest file-local type error there before the much larger `joyConMapper.js` surface.

## Constraints

Prefer small file-local or error-family beads over broad typing rewrites. Keep runtime behavior stable while tightening types, and favor durable guards that make future TSDoc/typed-JS checks easier to keep at zero.

## Open questions

- What is the best first slice: local Symphony typing, one browser input-handler file, or one toy file cluster?
- Which failures reflect missing type guards versus incorrect declared contracts?
- Should “keep them at zero” eventually rely only on project discipline, or also on a stricter CI/lint gate?

## Candidate next actions

- Land `dadeto-lvu1` so the next `gamepadCapture.js` type mismatch disappears.
- After `gamepadCapture.js`, prefer isolated toy or local-surface files before widening into the large `joyConMapper.js` surface.
- Prefer other isolated helper or local-surface files before the largest browser input-handler clusters.
- Decide what minimal regression guard should define “keep them at zero” once cleanup is complete.

## Tentative sequence

1. Start with the smallest high-signal file or module slice, not the whole check surface.
2. `keyboardCapture.js` is already clean; the next bounded file-local slice is `gamepadCapture.js`.
3. After that, continue with isolated helper/presenter/toy files before the largest `joyConMapper.js` input-handler cluster.
4. Split out any contract-shaped typing issue that suggests a broader API redesign instead of grinding through speculative local fixes.
5. Once `npm run tsdoc:check` reaches zero, define the smallest guardrail that will keep it there.
