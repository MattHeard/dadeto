# Commons tile generator parameter-bag cleanup

- Unexpected hurdle: full check first surfaced stale unused color bindings after moving palette handling to the structure motif.
- Diagnosis: `generateCommonsTile` is the renderer's intentional named tile-context callback; the internal structure motif had been repacking that context into a wider transport object.
- Fix: keep the named callback input as the domain value, pass the palette as one cohesive value to `structureTile`, and make roof/code explicit controls.
- Evidence: fresh target-file no-cache parameter-bag scan is clear in `.tmp/commons-tiles-arity.json`; Commons art/content/puzzle tests passed (3 suites, 19 tests); TSDoc passed; final elevated `TMPDIR=/home/matt/dadeto/.tmp npm run check` passed all 10 evaluators with 0 clones and 0 audit vulnerabilities (`.tmp/commons-tiles-arity-check-final.log`). Refreshed global inventory `.tmp/parameter-bag-global-after-commons-tiles.json`: 62 findings across 52 files, down from 64.
- Next-time guidance: preserve externally defined domain callback records, while splitting internal adapter records into explicit palette and behavior inputs.
