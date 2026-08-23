# GDP sector projection mutation triage

The initial full-file scan exposed a large gap between the public toy tests and the 345-line projection module. The updated scan instrumented 151 mutants: 89 killed, 58 non-static survivors, and 1 timeout. The random-helper fallback was inert because the projection core only invokes the callback as a dependency contract; it was replaced with `Math.random`, and exact helper-name lookup coverage was added.

The file remains incomplete and is intentionally not counted in the completed-file total. A helper-contract pass reduced the latest scan to 19 survivors (152 total, 128 killed) with 1 timeout. Remaining work is concentrated in anchor selection and the detailed primary/secondary forecast transition branches. The ledger records this triage state for resumption.
