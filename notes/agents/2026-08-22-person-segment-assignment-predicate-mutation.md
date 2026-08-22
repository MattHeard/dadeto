# Person segment assignment predicate mutation loop

- Unexpected hurdle: parser and normalization errors were intentionally collapsed into the public `false` result.
- Diagnosis: direct helper exports and exact parser/interval assertions distinguished valid normalization from defensive invalid-input boundaries.
- Fix: split parser array validation, covered assignment filtering, missing points, equal/reversed intervals, and marked only defensive type guards static.
- Evidence: final Stryker scan reported 80 killed, 21 static, 0 survivors, and 0 timeouts; focused tests passed 11/11.
- Next-time guidance: use exact helper-level error assertions when the public API deliberately normalizes all malformed requests.
