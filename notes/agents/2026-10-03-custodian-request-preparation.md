# Custodian and single-owner request preparation

Custodian predicate parsing and normalizers now belong to assignmentRequests;
the original public module re-exports all original helpers and interval APIs.
The parser retains its `parseRequest` function name. Validation errors, ordering,
falsy identifier normalization and collection filtering policies are preserved.

Both builders share proposal acceptance and graph/collection composition, with
named paired-owner and single-owner collection policies. The added property-read
regression proves proposal rejection precedes graph and collection access.

Unexpected hurdle: moving code alone retained the intra-file clone, and nested
callback composition exposed suffix clones with unrelated modules. Reading each
exact report led to a real preparation boundary and named collection policies,
not syntax-only changes or ignores. Strict minTokens14 remains unchanged.

Evidence: `.tmp/custodian-request-final-tests.log` and
`.tmp/custodian-request-final-coverage` collect the dedicated assignment suites
and exact coverage for the shared owner. `.tmp/custodian-request-final-static.log`
records the final nine non-duplication gates and clone count. Initial broad toy
tests all passed but did not prove exact owner coverage; dedicated suites did.

The aggregate goal stays open in dadeto-aaou; do not infer full global coverage
from focused tests. The preceding pushed checkpoint has terminal aggregate
coverage evidence in the segment-measurement owner note.
