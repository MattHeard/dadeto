# TSDoc Zero

## Outcome

Reduce Dadeto `npm run tsdoc:check` failures to zero and keep them at zero through future changes.

## Current state

`npm run tsdoc:check` still fails across several `src/core` browser/input-handler files, presenter files, toy files, and browser helpers, but the local Symphony file slice has already been fixed. The current open file-local bead is `dadeto-t33b`, which targets `src/core/browser/inputHandlers/keyboardCapture.js`.

## Constraints

Prefer small file-local or error-family beads over broad typing rewrites. Keep runtime behavior stable while tightening types, and favor durable guards that make future TSDoc/typed-JS checks easier to keep at zero.

## Open questions

- What is the best first slice: local Symphony typing, one browser input-handler file, or one toy file cluster?
- Which failures reflect missing type guards versus incorrect declared contracts?
- Should “keep them at zero” eventually rely only on project discipline, or also on a stricter CI/lint gate?

## Candidate next actions

- Fix the current `keyboardCapture.js` failure (`dadeto-t33b`).
- Re-run `npm run tsdoc:check` and choose the next smallest stable file-local slice from the remaining failures.
- Prefer other isolated helper or local-surface files before the largest browser input-handler clusters.
- Decide what minimal regression guard should define “keep them at zero” once cleanup is complete.

## Tentative sequence

1. Start with the smallest high-signal file or module slice, not the whole check surface.
2. Local Symphony is already clean; continue with isolated helper files before the largest browser input-handler clusters.
3. Re-run `npm run tsdoc:check` after each bead and select the next smallest stable cluster from the remaining failures.
4. Split out any contract-shaped typing issue that suggests a broader API redesign instead of grinding through speculative local fixes.
5. Once `npm run tsdoc:check` reaches zero, define the smallest guardrail that will keep it there.
