# Graph plot toy mutation follow-up

## Diagnosis and fix

The graph builder invokes its random callback only as a dependency contract and ignores the returned value. The default arrow's return value was therefore equivalent to any function. Replaced it with `Math.random` and added exact helper-name lookup coverage so the environment contract remains observable.

## Evidence

The final authoritative scan instrumented 6 mutants: all 6 killed, 0 static-ignored, 0 non-static survivors, and 0 timeouts. Focused Jest passed 4 tests.
