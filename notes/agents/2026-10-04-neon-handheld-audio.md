# Neon handheld audio

The inherited presenter supplied only triangle beeps; embedded runtime instances
are recreated for each submitted action. A browser-keyed audio session now owns
original pulse/pulse/triangle/noise music independently of deterministic rules.
The Neon runtime reports actual before/after transitions to that session. Do not
put oscillator timers or audio random state in campaign saves. Mosslight's old
cue path remains unchanged.

Physical gestures unlock playback, the X-menu Sound row mutes both music
and effects for free, and boolean `audioMuted` survives export/import. Hidden-tab,
pause and disposal paths cancel timers. Ended voice nodes disconnect.

The first browser evaluator confirmed real nonzero samples in both modes but
mistakenly expected `AudioParam.value` to reflect a newly scheduled gain change
after its context was already suspended. The tighter evaluator proves the
actual selected controller operation, captures master-gain automation, asserts
the real context is suspended and verifies oscillator counts stop increasing.
It still requires real nonzero samples, percussion, one context, successful
unmute and no browser errors. No retry, timeout increase or exemption was added.

Acceptance paths: `test/core/browser/game/neonAudio.test.js` and
`test/mosslight-e2e/neon-audio.spec.ts`; evidence recorded on dadeto-88mh.

Keep First-shift guide as the final main-menu entry: existing controller journeys
reach it by pressing up from row zero. Sound sits immediately before it (X, up,
up, A). Broad browser regression caught this real navigation compatibility
regression before publication; do not change working journeys to accommodate a
new menu item when its placement can preserve them.

The first full gate passed its tests, exact coverage and eight static checks,
but exposed strict JSDoc gaps and the global-policy scanner's rejection of an
injected alias named `document`. Use `browserDocument` and concrete AudioContext,
GainNode, AudioBuffer and timer types; type score dictionaries and callback
parameters explicitly. Both exact failing static commands then passed. Run the
complete cheap static suite before repeating full coverage; do not hide these
boundary problems with ts-nocheck or policy exemptions.

Final local evidence: `.tmp/neon-audio-full-check-green.log` and matching
`.exit` contain terminal full `npm run check` success (exit 0; test summary 1/1,
static summary 10/10, exact 100% coverage and zero clones). Focused integration
passed 283 tests across 20 suites with 100% coverage of all Neon modules and the
shared presenter. Broad browser run verified 79 cases; corrected isolated run
passed all 16 affected/audio/marker cases, covering every earlier failure. Logs:
`.tmp/neon-audio-integration-final.log`, `.tmp/neon-audio-browser-regression.log`,
`.tmp/neon-audio-browser-targeted-final.log`. Site and cloud builds passed.
The four-release parent goal remains unfinished.
