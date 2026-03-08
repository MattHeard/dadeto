# TSDoc Zero

## Outcome

Reduce Dadeto `npm run tsdoc:check` failures to zero and keep them at zero through future changes.

## Current state

`npm run tsdoc:check` currently fails across several `src/core` browser/input-handler files, presenter files, toy files, and `src/core/local/symphony.js`. The current error mix includes DOM element narrowing issues, nullable value mismatches, implicit `any` cases, index-signature issues, and union/type-guard gaps.

## Constraints

Prefer small file-local or error-family beads over broad typing rewrites. Keep runtime behavior stable while tightening types, and favor durable guards that make future TSDoc/typed-JS checks easier to keep at zero.

## Open questions

- What is the best first slice: local Symphony typing, one browser input-handler file, or one toy file cluster?
- Which failures reflect missing type guards versus incorrect declared contracts?
- Should “keep them at zero” eventually rely only on project discipline, or also on a stricter CI/lint gate?

## Candidate next actions

- Record the current `npm run tsdoc:check` failure inventory in a short project note with file and error-family counts.
- Create one bead for the `src/core/local/symphony.js` failures.
- Create one bead for one browser input-handler file such as `gamepadCapture.js`, `joyConMapper.js`, or `keyboardCapture.js`.
- Decide what minimal regression guard should define “keep them at zero” once cleanup is complete.

## Tentative sequence

1. Start with the smallest high-signal file or module slice, not the whole check surface.
2. Prefer local Symphony and isolated helper files before the largest browser input-handler clusters.
3. Re-run `npm run tsdoc:check` after each bead and select the next smallest stable cluster from the remaining failures.
4. Split out any contract-shaped typing issue that suggests a broader API redesign instead of grinding through speculative local fixes.
5. Once `npm run tsdoc:check` reaches zero, define the smallest guardrail that will keep it there.
