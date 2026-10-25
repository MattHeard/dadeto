import { buildIndustrialHeatPumpFeasibility } from './feasibility.js';
import { buildIndustrialHeatPumpThresholds } from './thresholds.js';

/**
 * Shape the arithmetic values for the public calculator result.
 * @param {Record<string, number>} input Validated assumptions.
 * @param {Record<string, number>} values Pure core calculation values.
 * @returns {Record<string, any>} Named comparison and caveat.
 */
export function buildIndustrialHeatPumpComparison(input, values) {
  return {
    annualUsefulHeatKwh: values.annualUsefulHeatKwh,
    incumbentFuelKwh: values.incumbentFuelKwh,
    heatPumpElectricityKwh: values.heatPumpElectricityKwh,
    requiredThermalPowerKw: values.requiredThermalPowerKw,
    requiredElectricalPowerKw: values.requiredElectricalPowerKw,
    annualCosts: {
      incumbentFuel: values.incumbentFuelAnnualCost,
      heatPumpElectricity: values.heatPumpElectricityAnnualCost,
      heatPumpMaintenance: values.heatPumpMaintenanceAnnualCost,
      heatPumpTotal: values.heatPumpAnnualOperatingCost,
    },
    annualOperatingSavings: values.annualOperatingSavings,
    simplePayback: buildSimplePayback(values),
    feasibility: buildIndustrialHeatPumpFeasibility(input, values),
    thresholds: buildIndustrialHeatPumpThresholds(values),
    disclosure: 'Hypothetical screening calculation from user-supplied assumptions; not engineering advice or evidence of commercially available equipment.',
  };
}

function buildSimplePayback(values) {
  return values.annualOperatingSavings > 0
    ? { status: 'available', years: values.simplePaybackYears }
    : { status: 'not-applicable' };
}
