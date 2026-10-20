# THREEFOLD Rat Growth Retrospective

- Unexpected hurdle: the new creature preview ID reached the frame metadata, but the rat's Mosslight render object dropped the preview flag. The first renderer regression caught that handoff gap; carrying `growthPreview` into the rat object let the renderer color the body consistently.
- Diagnosis: the first full local check exposed three independent failures: two max-lines warnings, one clone between rat reach/containment guards, and JSDoc type errors where initial `ratAction: null` narrowed the encounter too far. The check reports and jscpd report isolated each issue.
- Fix: extracted the shared present-rat lookup, modeled fate/action with a shared `ThreefoldEncounter` typedef and supported-action set, documented the rat sprite preview field, and split the long renderer/save test groups instead of disabling lint rules.
- Evidence: focused impact tests passed 10 suites / 141 tests; `npm run build` passed; `npm run manuals:check` validated 79 manuals; `npm run check` passed all 10 local gates with 959 suites / 6,616 tests across five shards and zero clones. Exact-head GitHub Full Check is still required before closing the Bead.
- Next-time guidance: for a new growth-sensitive entity, verify the full path from shared preview IDs through render-world objects, sprites, action mapping, and saved outcome cause. Keep migration tests for every prior schema and watch for shared guard logic that can trip clone detection.
- Open boundary: this loop handles only the authored rat. Multiple-creature fate resolution remains separate work.
