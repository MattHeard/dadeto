# Dependency gate lexical policy

Comment/string scanner transitions now come from one typed boundary table. Window/document property matching was redundant: the shared identifier-boundary matcher already accepts a dot. Keep fetch's separate trailing-delimiter policy, identifier-prefix/suffix exclusions and object-key-colon rejection. The new table tests lock those cases.

Removing the property-only matcher left its private string-delimiter branch unreachable. Remove that unused path rather than suppress coverage. The checker now uses regex or callable boundary policies only. Dynamic boundary-table indexing needs an explicit partial record type, otherwise strict type checking fails.

The blanket Stryker suppression was removed. The strict scanner then reported additional repeated dependency declarations; consolidate the normalized gate contract and derive optional handler and narrower scan contracts from it. Do not fix this by reinstating suppression or changing token thresholds.

Focused acceptance: `.tmp/depcruise-scanner-tests.log`, `.tmp/depcruise-scanner-coverage` (42 tests, all four metrics exactly 100%). Static aggregate artifacts `.tmp/depcruise-scanner-static-contracts.log`. Initial runs and tightened diagnoses remain in dadeto-aaou; final completion still requires zero clones and a green full aggregate.
