# Floating credit mutation scan

- Unexpected hurdle: the initial suite left the exchange-rate arithmetic mutant alive because it only used a unit credit rate.
- Diagnosis: the survivor changed division by `creditEurMicros` to multiplication, but the existing fixture used `creditEurMicros: 1`.
- Fix: added a refund assertion with `creditEurMicros: 2`; the final scan killed all 6 mutants.
- Next time: include non-unit conversion fixtures whenever arithmetic uses a rate or denominator.
