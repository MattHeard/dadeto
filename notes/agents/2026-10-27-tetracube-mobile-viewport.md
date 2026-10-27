# Retained cloud screenshots found a Tetracube viewport defect

- Hurdle: all14 cloud cases passed, yet inspection of the retained mobile PNG
  showed the world canvas extending past the visible card edge. Assertions about
  canvas visibility alone missed this.
- Diagnosis: the wrapper combined auto width,16:9 aspect ratio and minimum height;
  its parent hid the resulting overflow. The source-style regression first
  failed on the absent width constraint.
- Fix: constrain wrapper width100%/min-width0; retain the actual responsive canvas
  measurement/render path. Add cloud bounds assertions at320/390px, recording
  the baseline frame after viewport checks so resize cannot fake input feedback.
- Evidence: current cloud run40487647737/5b97143 retained two PNGs plus inline
  interaction JSON in the HTML report's ZIP.14/14 cases passed; Tetracube1863ms,
  five placements; no human enjoyment inferred. Source-style and mechanics focus
  passed50 tests and build passed. See acceptance.md for SHA-256/artifact links.
- Next: later cloud evidence must prove the fix's bounds. The old screenshot
  proves the defect only. Human anticipation/compromise/fit/growth observations
  remain unassessed; avoid claiming mechanical automation establishes enjoyment.

- Final local gate:50 focused tests plus layout rerun pass; `npm run check -- --skip-tests` passes10/10 after fixing an invalid JSDoc-tag warning by using Jest's supported ordinary docblock. Build,86 manuals and browser-free discovery of14 cloud tests pass. No lint suppression was added.
- Shared cloud run40487647737 and both cleanup jobs succeeded; its manual production handoff40491417626 was skipped. This proves the old-code report retention/interaction, not the new viewport bounds. New code awaits asynchronous CI/cloud evidence.
