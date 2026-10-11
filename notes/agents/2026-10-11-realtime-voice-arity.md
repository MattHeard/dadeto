# Realtime voice presenter parameter-bag cleanup

- Unexpected hurdle: none in verification; the presenter needed a stable session context to keep DOM controls and injected fetch together while forwarding AllowEffects explicitly.
- Diagnosis: the live no-cache inventory identified the peer startup context and peer state-listener event/log options as the two expanded bags.
- Fix: `startPeerConnection` now receives the explicit AllowEffects token, state, and one cohesive session context. Peer state wiring separates the event configuration from its log destination.
- Evidence: target file is clear in `.tmp/realtime-voice-arity.json`; presenter/toy tests passed (2 suites, 19 tests); TSDoc passed; final elevated `TMPDIR=/home/matt/dadeto/.tmp npm run check` passed all 10 evaluators with 0 clones and 0 audit vulnerabilities (`.tmp/realtime-voice-arity-check.log`). Refreshed global inventory `.tmp/parameter-bag-global-after-realtime-voice.json`: 56 findings across 49 files, down from 58.
- Next-time guidance: preserve explicit permission arguments when grouping session dependencies; event subscriptions and output destinations are separate concerns.
