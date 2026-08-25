# Public offers mutation scan

- Unexpected hurdle: none; the focused handler tests covered both successful and unavailable-pricing paths.
- Diagnosis: the authoritative scan instrumented 21 mutants and killed all 21.
- Fix: no production change was needed; existing active filtering, quote, response-shape, and failure assertions were complete.
- Next time: retain explicit public response-shape assertions for small boundary handlers.
