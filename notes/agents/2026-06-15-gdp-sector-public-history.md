# GDP Sector Projection: public history + configurable forecast

- Hurdle: the toy originally hardcoded its historical points and projection endpoints, which made it hard to reuse with a different forecast window.
- Diagnosis: the graph payload already supported multi-series output, so the missing piece was input normalization and a stable historical source.
- Fix: made the toy accept either raw rows or `{ rows, forecast }`, defaulted to a committed World Bank historical snapshot when rows are omitted, and documented the forecast knobs.
- Next time: keep toy docs synchronized with the actual input contract so the acceptance harness does not drift from the code.
