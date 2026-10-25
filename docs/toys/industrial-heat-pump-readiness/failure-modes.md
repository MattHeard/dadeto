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
- Stale comparison: invalid edited input leaves the previous valid result
  visible or still exportable.
- Download/print unavailable: browser APIs or a blocked automatic download may
  prevent the user from receiving the optional local brief.
- Preset drift: a scenario selector changes its label but not all displayed
  assumptions, or reset fails to restore the base fixture.

## Detection Signals

- Error signatures/log lines: validation returns stable field-specific error
  codes; calculation must not throw for ordinary invalid user input.
- Observable symptoms: NaN/infinity, implausible unit magnitudes, a payback
  number despite nonpositive savings, or one combined status hiding separate
  temperature/power/economic results; old cards remaining visible after an
  invalid edit; a preset label disagreeing with its inputs; or export containing
  different values from the current form.
- Failing command(s):

  ```sh
  node scripts/run-jest.js --runInBand test/core/industrialHeatPumpReadiness.test.js test/browser/industrialHeatPumpPage.test.js
  ```

## First-Response Playbook

1. Capture the exact fixture and assertion output.
2. Check the unit conversions and the formula with an independent hand
   calculation before changing implementation.
3. Add a minimal regression for the failing input or boundary; keep all external
   data and thermodynamic assumptions out of the core.
4. For a page defect, use the JSDOM presenter test before rebuilding the static
   site; inspect the mobile preview after a successful build.

## Promoted from Real Failures

- Date: 2026-10-25.
- Failure observed: the interactive presenter exceeded the non-core 50-line
  boundary and did not match the required thin-wrapper shape.
- Root cause: browser interaction logic and scenario fixtures were placed under
  `src/browser` rather than the dependency-injected core browser layer.
- Fix implemented: moved the presenter and scenarios to
  `src/core/browser/industrialHeatPump`; retained a short browser adapter that
  injects calculation, download, and print dependencies.
- Guardrail added (test/doc/harness): `npm run non-core-thin` plus the focused
  Jest command now check the boundary and the presenter behavior.

## Portable export and arithmetic overflow

- Finite operands can still overflow arithmetic. The boundary inspects the
  calculated comparison before display/export and returns a numeric-range
  error if any emitted number is non-finite. Do not reject legitimate
  not-applicable thresholds by validating unused raw division results.
- Keep the export's optional industry-graph references as metadata. They must
  survive serialization without changing the calculation or requiring a
  catalog lookup. Recalculate from exported assumptions to detect drift.
- Regression evidence: model overflow cases and the presenter export,
  reference-retention, stale-result hiding, and reset tests.
