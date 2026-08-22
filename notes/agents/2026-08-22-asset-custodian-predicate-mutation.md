# Asset custodian predicate mutation loop

- Unexpected hurdle: the public predicate combines two identity-filtered interval checks and collapses all malformed input to `false`.
- Diagnosis: positive-overlap unrelated-identity cases were needed to distinguish filtering from evaluating every assignment; direct helper tests covered scalar coercion and interval boundaries.
- Fix: added compound occupancy, unrelated-overlap, numeric/object coercion, malformed normalization, and exact interval assertions; classified only defensive boundaries as static.
- Evidence: final Stryker scan reported 82 killed, 84 static/no-coverage mutants, 0 survivors, and 0 timeouts; focused tests passed 16/16.
- Next-time guidance: use positively overlapping unrelated records when testing identity filters; touching intervals cannot kill filter-removal mutants.
