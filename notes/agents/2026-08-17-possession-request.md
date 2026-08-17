# Possession request toy

- Unexpected hurdle: the first timestamp test used an invalid `Date.parse` suffix and failed the valid UTC-minute case.
- Diagnosis path: focused Jest showed the exact normalization mismatch; the parser now validates the captured minute with an explicit `:00Z` expansion.
- Chosen fix: keep the request pure and deterministic, with stable field-level errors and no inventory or logistics coupling.
- Next-time guidance: build feasibility as the next layer over `POSS1` and `OBJE1`; preserve this request shape as the customer-context boundary.
