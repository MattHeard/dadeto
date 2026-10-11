# Mosslight renderer parameter-bag cleanup

- Unexpected hurdle: none in the final loop; the text wrapping change needed two focused helpers to keep the arity reduction behaviorally clear.
- Diagnosis: the live no-cache scan identified `textPanel`'s expanded style parameter and `wrapText`'s packed context/layout inputs.
- Fix: kept panel style as one cohesive value and separated text wrapping into line calculation and drawing at a typed logical position.
- Evidence: target-file fresh no-cache scan is clear in `.tmp/mosslight-renderer-arity.json`; focused renderer/control tests passed (2 suites, 22 tests); `npm run tsdoc:check` passed; elevated `TMPDIR=/home/matt/dadeto/.tmp npm run check` passed all 10 evaluators with 0 clones and 0 audit vulnerabilities (`.tmp/mosslight-renderer-arity-check.log`). Refreshed global inventory `.tmp/parameter-bag-global-after-mosslight-renderer.json`: 64 findings across 53 files, down from 66.
- Next-time guidance: preserve cohesive visual style and position values, but split operations that combine layout calculation and rendering.
