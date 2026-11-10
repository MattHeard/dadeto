import { calculateIndustrialHeatPumpValues } from './values.js';
import { buildIndustrialHeatPumpComparison } from './comparison.js';

/**
 * Trusted screening assumptions after the boundary has interpreted all fields.
 * Units and domain ranges retain the existing calculator policy. A number here
 * does not promise that every intermediate arithmetic result will be finite.
 * Trusted callers maintain those field types while computation reads them; the
 * public boundary preserves legacy accessors rather than snapshotting them.
 * @typedef {object} HeatPumpAssumptions
 * @property {number} requiredSupplyTemperatureC Required process temperature.
 * @property {number} annualUsefulHeatKwh Annual useful heat demand.
 * @property {number} annualOperatingHours Annual operating hours.
 * @property {number} incumbentFuelPricePerKwh Incumbent fuel tariff.
 * @property {number} incumbentEfficiency Incumbent conversion efficiency.
 * @property {number} electricityPricePerKwh Electricity tariff.
 * @property {number} heatPumpCop Assumed coefficient of performance.
 * @property {number} heatPumpMaxTemperatureC Assumed supported temperature.
 * @property {number} installedCost Installed capital cost.
 * @property {number} annualMaintenanceCost Annual maintenance cost.
 * @property {number} availableElectricalPowerKw Site electrical capacity.
 * @property {number} targetPaybackYears Target simple payback period.
 */

/**
 * Raw arithmetic deliberately includes intermediate NaN and infinities. Public
 * validity depends on numbers included in the comparison, not this entire record.
 * @typedef {object} HeatPumpValues
 * @property {number} annualUsefulHeatKwh Annual useful heat demand.
 * @property {number} incumbentFuelKwh Incumbent annual fuel demand.
 * @property {number} heatPumpElectricityKwh Heat-pump annual electricity demand.
 * @property {number} requiredThermalPowerKw Required thermal capacity.
 * @property {number} requiredElectricalPowerKw Required electrical capacity.
 * @property {number} incumbentFuelAnnualCost Incumbent annual fuel cost.
 * @property {number} heatPumpElectricityAnnualCost Heat-pump electricity cost.
 * @property {number} heatPumpMaintenanceAnnualCost Heat-pump maintenance cost.
 * @property {number} heatPumpAnnualOperatingCost Heat-pump total operating cost.
 * @property {number} annualOperatingSavings Annual operating savings.
 * @property {number} allowedElectricityCost Target-payback electricity budget.
 * @property {number} simplePaybackYears Raw simple payback quotient.
 * @property {number} minimumCopForTargetPayback Raw minimum COP threshold.
 * @property {number} maximumInstalledCostForTargetPayback Raw capital threshold.
 */

/** @typedef {{status: 'available', years: number} | {status: 'not-applicable'}} HeatPumpPayback */
/** @typedef {{status: 'available', value: number} | {status: 'not-achievable'}} HeatPumpThreshold */
/** @typedef {{minimumCopForTargetPayback: HeatPumpThreshold, maximumInstalledCostForTargetPayback: HeatPumpThreshold}} HeatPumpThresholds */
/**
 * @typedef {object} HeatPumpFeasibility
 * @property {{status: 'within-limit' | 'above-heat-pump-limit', requiredC: number, supportedMaximumC: number}} temperature Independent temperature assessment.
 * @property {{status: 'within-limit' | 'insufficient-site-capacity', requiredKw: number, availableKw: number}} electricalPower Independent power assessment.
 * @property {{status: 'positive-operating-savings' | 'no-positive-operating-savings'}} economics Operating-cost assessment.
 * @property {{status: 'not-applicable' | 'meets-target' | 'exceeds-target', targetYears: number}} targetPayback Target-payback assessment.
 */
/**
 * @typedef {object} HeatPumpComparison
 * @property {number} annualUsefulHeatKwh Annual useful heat demand.
 * @property {number} incumbentFuelKwh Annual incumbent fuel demand.
 * @property {number} heatPumpElectricityKwh Annual heat-pump electricity demand.
 * @property {number} requiredThermalPowerKw Required thermal capacity.
 * @property {number} requiredElectricalPowerKw Required electrical capacity.
 * @property {{incumbentFuel: number, heatPumpElectricity: number, heatPumpMaintenance: number, heatPumpTotal: number}} annualCosts Annual operating costs.
 * @property {number} annualOperatingSavings Annual operating savings.
 * @property {HeatPumpPayback} simplePayback Available or inapplicable payback.
 * @property {HeatPumpFeasibility} feasibility Independent domain assessments.
 * @property {HeatPumpThresholds} thresholds Available or unachievable thresholds.
 * @property {string} disclosure Screening limitation disclosure.
 */
/** @typedef {{field: string, code: 'object-required' | 'required' | 'finite-number-required' | 'below-minimum' | 'above-maximum' | 'calculation-not-finite'}} HeatPumpIssue */
/** @typedef {{valid: false, errors: HeatPumpIssue[]} | {valid: true, comparison: HeatPumpComparison}} HeatPumpResult */

/**
 * Legacy accessors can change values after boundary interpretation. Keep these
 * externally copied slots explicit and opaque instead of promising numeric data
 * for every unknown public caller. Arithmetic-derived fields retain their types.
 * @typedef {Omit<HeatPumpComparison, 'annualUsefulHeatKwh' | 'annualCosts' | 'feasibility'> & {
 * annualUsefulHeatKwh: unknown,
 * annualCosts: {incumbentFuel: number, heatPumpElectricity: number, heatPumpMaintenance: unknown, heatPumpTotal: number | string},
 * feasibility: {
 * temperature: {status: HeatPumpFeasibility['temperature']['status'], requiredC: unknown, supportedMaximumC: unknown},
 * electricalPower: {status: HeatPumpFeasibility['electricalPower']['status'], requiredKw: number, availableKw: unknown},
 * economics: HeatPumpFeasibility['economics'],
 * targetPayback: {status: HeatPumpFeasibility['targetPayback']['status'], targetYears: unknown}
 * }
 * }} HeatPumpPublicComparison
 */
/** @typedef {{valid: false, errors: HeatPumpIssue[]} | {valid: true, comparison: HeatPumpPublicComparison}} HeatPumpPublicResult */

/**
 * Calculate the public screening result from interpreted numeric assumptions.
 * The finite-result decision applies only to numbers actually displayed/exported.
 * @param {HeatPumpAssumptions} assumptions Trusted unit-labelled assumptions.
 * @returns {HeatPumpResult} Comparison or the existing numeric-range failure.
 */
export function calculateTrustedIndustrialHeatPump(assumptions) {
  const values = calculateIndustrialHeatPumpValues(assumptions);
  const comparison = buildIndustrialHeatPumpComparison(assumptions, values);
  if (containsNonFiniteNumber(comparison))
    return {
      valid: false,
      errors: [{ field: 'input', code: 'calculation-not-finite' }],
    };
  return { valid: true, comparison };
}

/** @typedef {{[key: string]: number | string | HeatPumpComparisonValues}} HeatPumpComparisonValues */

/**
 * Preserve the original finite-result traversal of public comparison variants.
 * Its concrete schema contains numbers, status strings and nested records.
 * @param {HeatPumpComparisonValues} comparison Computed public domain record.
 * @returns {boolean} Whether an included number is non-finite.
 */
function containsNonFiniteNumber(comparison) {
  return Object.values(comparison).some(value =>
    typeof value === 'number'
      ? !Number.isFinite(value)
      : typeof value === 'object' && containsNonFiniteNumber(value)
  );
}
