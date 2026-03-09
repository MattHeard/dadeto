## Context

`dadeto-vheu` investigated why Symphony-launched Ralph runs appeared to stop after startup work even after launcher compatibility, model selection, and runner-exit reconciliation were already fixed.

## Diagnosis

The latest `dadeto-n3nd` stderr transcripts did not end on a local launcher/runtime exception.

- Both runs reached real repo work and emitted long exploration/edit transcripts.
- Both transcripts ended at Codex's `tokens used` footer with no later repo-local failure marker.
- The recurring shell snapshot validation warning appeared near startup in successful and unsuccessful runs alike, so it was evidence noise rather than the main stop cause.

The strongest local inference is that the spawned runner was exhausting session budget through broad scans, large file dumps, and verbose patch/test output before it finished the bead loop.

## Chosen mitigation

I tightened the Ralph prompt contract in [launcherCodex.js](/home/matt/dadeto/src/local/symphony/launcherCodex.js) so spawned runs are explicitly told to:

- run exactly one bounded bead loop
- keep terminal usage terse and evidence-driven
- prefer focused `rg` / `sed` reads over broad scans or large file dumps
- stop with bead evidence if blocked or partial instead of widening scope

## Validation

- Focused launcher test passed: `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false test/local/symphony.launcherCodex.test.js`
- Full suite passed: `npm test`

## Next-time guidance

If Symphony runner sessions still stop early after this prompt tightening, the next slice should capture richer end-of-run artifacts from `codex exec` itself, because the remaining unknown would be session-level termination policy rather than repo-local launch behavior.
