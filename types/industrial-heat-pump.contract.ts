import { parseIndustrialHeatPumpInput } from '../src/logic/boundary/industrial-heat-pump/input.js';
import { calculateTrustedIndustrialHeatPump } from '../src/logic/core/industrial-heat-pump/industrial-heat-pump.js';
import { calculateIndustrialHeatPumpReadiness } from '../src/browser/industrialHeatPumpReadiness.js';
import { calculateIndustrialHeatPumpValues } from '../src/logic/core/industrial-heat-pump/values.js';
import type { HeatPumpAssumptions, HeatPumpResult } from '../src/logic/core/industrial-heat-pump/industrial-heat-pump.js';

declare const assumptions: HeatPumpAssumptions;
const values = calculateIndustrialHeatPumpValues(assumptions);
const savings: number = values.annualOperatingSavings;
void savings;
// @ts-expect-error A sparse numeric record is missing the named assumptions.
calculateIndustrialHeatPumpValues({heatPumpCop: 2});
// @ts-expect-error Numeric strings are not trusted numeric assumptions.
calculateIndustrialHeatPumpValues({...assumptions, heatPumpCop: '2'});
// @ts-expect-error Raw arithmetic does not contain public feasibility decisions.
values.feasibility;

const result: HeatPumpResult = calculateTrustedIndustrialHeatPump(assumptions);
if (result.valid) {
  const payback = result.comparison.simplePayback;
  if (payback.status === 'available') {
    const years: number = payback.years;
    void years;
  } else {
    // @ts-expect-error Inapplicable payback has no numeric years field.
    payback.years;
  }
  const threshold = result.comparison.thresholds.minimumCopForTargetPayback;
  if (threshold.status === 'available') {
    const value: number = threshold.value;
    void value;
  } else {
    // @ts-expect-error An unachievable threshold has no numeric value.
    threshold.value;
  }
} else {
  const issues = result.errors;
  void issues;
  // @ts-expect-error Invalid results do not contain a public comparison.
  result.comparison;
}

const parsed = parseIndustrialHeatPumpInput(assumptions);
if (parsed.ok && parsed.evidence.valid) {
  const trustedResult: HeatPumpResult = calculateTrustedIndustrialHeatPump(parsed.evidence.assumptions);
  void trustedResult;
}
declare const unknownInput: unknown;
// @ts-expect-error Uninterpreted input cannot enter trusted computation.
calculateTrustedIndustrialHeatPump(unknownInput);
// @ts-expect-error A parser failure is not trusted assumptions.
calculateTrustedIndustrialHeatPump(parsed.evidence.assumptions);

const publicResult = calculateIndustrialHeatPumpReadiness(assumptions);
if (publicResult.valid) {
  // @ts-expect-error Legacy accessors can replace a directly copied public slot.
  const guaranteedHeat: number = publicResult.comparison.annualUsefulHeatKwh;
  void guaranteedHeat;
  const computedFuel: number = publicResult.comparison.incumbentFuelKwh;
  void computedFuel;
}
