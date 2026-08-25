# Request normalization mutation scan

- Unexpected hurdle: none; the focused request suite covered normal and malformed input paths.
- Diagnosis: the authoritative scan instrumented 18 mutants and killed all 18.
- Fix: no production change was needed; existing body, content-type, metadata, and malformed-input assertions were sufficient.
- Next time: retain paired valid and malformed request fixtures for normalization boundaries.
