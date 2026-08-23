# GDP sector projection mutation triage

The initial full-file scan exposed a large gap between the public toy tests and the 345-line projection module. The updated scan instrumented 151 mutants: 89 killed, 58 non-static survivors, and 1 timeout. The random-helper fallback was inert because the projection core only invokes the callback as a dependency contract; it was replaced with `Math.random`, and exact helper-name lookup coverage was added.

The file is complete. Anchor-selection assertions eliminated the final four survivors, and replacing the incrementing year loop with finite `Array.from` year iteration eliminated the mutation-induced decrement-loop timeout.

Final evidence: 154 mutants, 99 killed, 0 static-ignored, 0 non-static survivors, 0 timeouts, and 0 runtime errors; focused Jest passed 15 tests.
