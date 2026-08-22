# Asset segment assignment predicate mutation loop

- Unexpected hurdle: the public wrapper collapsed parser failures to the same `false` result, leaving validation mutants alive.
- Diagnosis: exported pure parsing, normalization, and interval helpers and added exact branch assertions.
- Fix: covered malformed shapes, null/blank identifiers, missing references, reversed intervals, and equality boundaries; retained only explicitly static defensive type-boundary mutants.
- Evidence: the final scoped Stryker scan reported 79 killed, 24 static ignored, 0 survivors, and 0 timeouts; focused tests passed 14/14.
- Next-time guidance: include the dedicated test file in the mutation scan and test pure validators directly when the production API intentionally normalizes errors.
