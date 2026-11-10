import { buildIndustrialHeatPumpFeasibility } from './feasibility.js';
import { buildIndustrialHeatPumpThresholds } from './thresholds.js';

/**
 * Shape the arithmetic values for the public calculator result.
 * @param {import('./industrial-heat-pump.js').HeatPumpAssumptions} input Validated assumptions.
 * @param {import('./industrial-heat-pump.js').HeatPumpValues} values Pure core calculation values.
 * @returns {import('./industrial-heat-pump.js').HeatPumpComparison} Named comparison and caveat.
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
    disclosure:
      'Hypothetical screening calculation from user-supplied assumptions; not engineering advice or evidence of commercially available equipment.',
  };
}

/**
 * Select available payback only for positive operating savings.
 * @param {import('./industrial-heat-pump.js').HeatPumpValues} values Raw arithmetic values.
 * @returns {import('./industrial-heat-pump.js').HeatPumpPayback} Public payback state.
 */
function buildSimplePayback(values) {
  return values.annualOperatingSavings > 0
    ? { status: 'available', years: values.simplePaybackYears }
    : { status: 'not-applicable' };
}
