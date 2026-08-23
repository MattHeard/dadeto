# Memory scalar/vector write mutation follow-up

## Unexpected hurdle

The initial full-file scan found 16 survivors in low-level container and validation branches despite broad public-flow coverage.

## Diagnosis and fix

Several branches were behaviorally equivalent for canonical array indices or through the public write result. Added focused test-only contracts for array access, invalid and valid roots, exact fallback shapes, request error fields, optional helper types, and permanent-memory reads. Removed redundant numeric array conversion branches.

## Evidence

The final authoritative scan instrumented 199 mutants: 194 killed, 0 static-ignored, 0 non-static survivors, and 0 timeouts. Focused Jest passed 21 tests.
