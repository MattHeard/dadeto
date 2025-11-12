# Complexity-6 Trim

- **Unexpected**: after moving the bulk of admin helper logic into smaller units there was still a complexity 6 warning because `extractCsvRows` still contained multiple guards; I had to split the work so the new helper took over the branching while the extracted rows function became a single guard plus delegation.
- **Diagnosis**: `reports/lint/lint.txt` kept flagging `continuity` until I restructured the CSV toy to offload normalization, line trimming, and header parsing into `normalizeInputLines`/`buildRowsFromLines`, leaving `extractCsvRows` with only one `if` inside it (and adding two small helpers for the new responsibilities).
- **Learning**: when a function keeps tripping the complexity ceiling, factor out the branching instead of piling more conditions on it; helpers can be localized and moved near the caller so the public surface stays simple.
