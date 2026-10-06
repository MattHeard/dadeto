# jscpd threshold 13 cleanup

- Hurdle: lowering `minTokens` from 14 to 13 exposes 117 clone fragments, many across old toy modules; the first clone pair includes a meaningful world-line segment validator.
- Diagnosis: inspect `reports/duplication/jscpd-report.json` pair-by-pair and compare behavior before extracting shared helpers. A first attempt to reuse an unrelated registry normalizer changed semantics and was discarded.
- Fix: `spacetimeWorldLine` now normalizes each segment through the existing `normalizeSegment`, removing its duplicate required-field validation while preserving validation and output behavior. Its focused suite passes 4/4.
- Guidance: refactor cohesive clone clusters into established shared modules, rerun duplication after each slice, and avoid suppressions or semantically unrelated helper reuse. Current report has 116 clones; objective remains open.
