# Battleship Fleet Clone

- Hurdle: the first refactor for the fleet clone removed the duplication but tripped the repo `max-params` lint rule.
- Diagnosis: the directional helper was still carrying six positional parameters after the clone extraction.
- Fix: switched the shared candidate data to a small context object and kept the directional wrapper positional, which removed the clone and satisfied lint.
- Next time: when a clone is coming from repeated helper calls, prefer a compact context object or a single shared builder instead of widening the function signature.
