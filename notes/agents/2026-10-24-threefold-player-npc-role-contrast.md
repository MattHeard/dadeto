# THREEFOLD player and NPC role contrast

- Unexpected hurdle: the previous renderer change added a visible cyan NPC tag, but Mara had no role marker; the player could still read as another small sprite at the 160 × 144 display size.
- Diagnosis: compare the presentation for both actor classes at the renderer boundary. NPC-only labeling left role recognition dependent on sprite detail and scale.
- Chosen fix: add a fixed-size gold-framed YOU tag to Mara while retaining cyan-framed NPC tags for residents. Regression coverage checks both labels, their distinct colors, and 2px grid alignment.
- Validation: PR #2806 merged as d53abdbb752b6e7bf36d76f5da7af06c8af1ecab. Focused local Jest did not execute because the installed Jest adapter threw before tests at test.errors.map. Exact-head Full Check 40080863352 is still running; Terraform Validate 40080863436 passed.
- Next-time guidance: inspect a native-size 160 × 144 game frame with both role tags visible after CI completes; do not treat source-level glyph assertions as proof of visual clarity on the deployed page.
