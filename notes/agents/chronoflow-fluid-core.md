# Chronoflow fluid-core loop

- Unexpected hurdle: the first simultaneous flux implementation bounded outgoing water but could overfill a receiver when multiple faces flowed into a nearly full cell. Floating-point exact equality also failed for 0.6 - 0.2.
- Diagnosis path: fixed-step replay and volume-sum assertions isolated the capacity edge case; focused module coverage then identified untested reverse flow, solid boundaries, donor limiting, and state validation.
- Chosen fix: plan face fluxes before mutation, sum incoming and outgoing requests, scale each face by both donor availability and receiver capacity, then apply deltas together. Tests use numeric tolerance for conservation and exact [0,1] capacity bounds.
- Additional hurdle: jscpd reported repeated axis-specific face code and later a generic nested-loop tail. One direction table now drives both axes; an existing checker loop uses a guard/continue to avoid the low-token false clone without source suppression.
- Next-time guidance: preserve simultaneous flux planning and test full receivers whenever changing the solver. Keep solver inputs explicit and deterministic; time sampling belongs in the future network adapter.
- Evidence: focused Chronoflow Jest suite (7 tests) passes with 100% module coverage; `npm run duplication` reports 0 clones; `npm run lint`, `npm run tsdoc:check`, `git diff --check`, and full `npm run check` pass. Full coverage artifact reports all four metrics at 100%; aggregate check summary passed 10/10 evaluators, including 9/9 local Playwright scenarios.
