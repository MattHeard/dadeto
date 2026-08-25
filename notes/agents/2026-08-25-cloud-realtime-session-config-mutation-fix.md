# Mutation scan: cloud realtime session-config

- Unexpected hurdle: three mutations targeted fixed public protocol constants.
- Diagnosis: those constants are the declared OpenAI session contract; the implementation behavior was fully exercised by the dependent tests.
- Fix: no source change was needed; recorded the narrow fixed-constant boundary.
- Evidence: final scan killed 7 mutants, ignored 3 static constant mutants, and left 0 survivors or timeouts; 2 tests passed.
- Next-time guidance: keep protocol constants explicit and classify their literal substitutions as static contract boundaries.
