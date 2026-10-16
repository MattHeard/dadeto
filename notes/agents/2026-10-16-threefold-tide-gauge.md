# THREEFOLD deterministic tide gauge

- Unexpected hurdles: a zero-progress state would not visibly communicate the gauge's scale without a track; the initial duplicated rectangle literals triggered jscpd.
- Diagnosis: inspected `toFramePayload` and its drawing contract; THREEFOLD can append fixed 160 × 144 shapes after the common world and HUD layers without changing shared renderer behavior.
- Fix: render a labeled, always-visible track and a stage-colored fill whose normalized width comes from crisis elapsed minutes divided by the authored aftermath threshold. A shared tide-bar constructor avoids duplicate rectangle literals. Expose the same ratio in frame metadata and cover rising, urgent, surge, and aftermath states.
- Next-time guidance: keep crisis presentation derived from simulation state, and verify every stage at a fixed canvas position. This is a visual progress cue, not a physical water simulation or a complete crisis response system.
