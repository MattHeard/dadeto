# Mutation loop: cloud/firestore

- Unexpected hurdle: the initial suite changed all cache-bypass inputs at once, so mutations of individual OR branches survived despite the correct first-call result.
- Diagnosis: a single bypass call is observationally equivalent to a cached call when the cache is empty.
- Fix: added isolated tests for custom bootstrap, Firestore factory, and environment identities, each invoked twice with exact factory call-count assertions.
- Evidence: final Stryker scan instrumented 24 mutants with all 24 killed, 0 survived, and 0 timed out; focused Jest passed 4 tests.
- Next-time guidance: test cache/bypass logic with repeated calls and collaborator call counts, not only returned values.
