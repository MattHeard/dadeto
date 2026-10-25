# Industrial heat-pump readiness failure modes

## Initial Predicted Failure Classes

- Setup/configuration mismatch: a fixture or caller supplies a different unit
  than the property name documents.
- Invalid or missing inputs: absent tariff/temperature values, negative demand,
  zero operating hours, efficiency outside `(0, 1]`, or nonpositive COP.
- Dependency/service unavailable: not applicable to the pure calculation; no
  service is allowed in this slice.
- Non-deterministic timing or ordering: none expected; the calculator is pure.
- Environment-specific behavior: floating-point rounding could make displayed
  currency differ at the final cent while exact calculation inputs remain
  stable.
- Misleading output: a payback year appears when annual savings are zero or
  negative, or technical feasibility is conflated with economic attractiveness.

## Detection Signals

- Error signatures/log lines: validation returns stable field-specific error
  codes; calculation must not throw for ordinary invalid user input.
- Observable symptoms: NaN/infinity, implausible unit magnitudes, a payback
  number despite nonpositive savings, or one combined status hiding separate
  temperature/power/economic results.
- Failing command(s): `node --experimental-vm-modules
  node_modules/jest/bin/jest.js --runInBand test/core/industrialHeatPumpReadiness.test.js`.

## First-Response Playbook

1. Capture the exact fixture and assertion output.
2. Check the unit conversions and the formula with an independent hand
   calculation before changing implementation.
3. Add a minimal regression for the failing input or boundary; keep all external
   data and thermodynamic assumptions out of the core.

## Promoted from Real Failures

- Date: none yet.
- Failure observed: none yet.
- Root cause: none yet.
- Fix implemented: none yet.
- Guardrail added (test/doc/harness): predicted failure cases and dedicated
  focused test command are recorded above.
