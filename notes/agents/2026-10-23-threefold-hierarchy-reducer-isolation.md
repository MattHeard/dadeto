# THREEFOLD hierarchy reducer result isolation

- Unexpected hurdle: the reducer factory captured `affectedEntityIds` and returned that same mutable array to every caller.
- Diagnosis: a caller could mutate one result and silently change the targets processed by later calls, violating deterministic reuse even though authored scene input stayed untouched.
- Chosen fix: snapshot IDs when creating the reducer and return a fresh ID array on each invocation. The regression mutates the first result, then verifies the next call still applies the original stable target set.
- Next-time guidance: pure reducers must isolate both input state and returned collections from their internal captured state. The broader semantic-composite and campaign acceptance remains open.
