# Agent Retrospective: joyConMapper capture-detector slice

- **Unexpected hurdle:** The next complexity warning was supposed to sit inside `joyConMapper.js`, but after the payload/row-state work the lint output stopped highlighting any specific helper, so the smallest still-active slice was unclear.
- **Diagnosis path:** I read through the capture and update helpers and spotted that `detectCurrentControlCapture` still wrapped a concrete `if/else` over `state.currentControl.type`, which seemed like the obvious place the strict cyclomatic budget would trip next once we converted the other helpers.
- **Chosen fix:** Added a tiny `CaptureDetectionContext`, pulled button and axis logic into dedicated helpers, and wired a `CAPTURE_DETECTORS` map so the main `detectCurrentControlCapture` no longer contains a branch; the new helpers have clean JSDoc so lint keeps them documented.
- **Next-time guidance:** Always re-run `npm run lint` after landing helper extractions so any new doc/regression warnings show up before recording the bead evidence, and capture-slice beads should mention the remaining non-joyConMapper warnings that still float in the reports.
