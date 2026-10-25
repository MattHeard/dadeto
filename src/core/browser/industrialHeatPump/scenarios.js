/** @typedef {{label:string,description:string,inputs:Readonly<Record<string,number>>}} HeatPumpScenario */

const BASE_INPUTS = Object.freeze({
  requiredSupplyTemperatureC: 120,
  annualUsefulHeatKwh: 480000,
  annualOperatingHours: 6000,
  incumbentFuelPricePerKwh: 0.12,
  incumbentEfficiency: 0.85,
  electricityPricePerKwh: 0.18,
  heatPumpCop: 2,
  heatPumpMaxTemperatureC: 130,
  installedCost: 150000,
  annualMaintenanceCost: 4000,
  availableElectricalPowerKw: 60,
  targetPaybackYears: 5,
});

/**
 * Illustrative assumptions for comparing possible future operating conditions.
 * None of these cases imply that the temperature/COP pairs are commercially
 * available or validated for an actual site.
 * @type {Readonly<Record<'base'|'conservative'|'optimistic',HeatPumpScenario>>}
 */
export const INDUSTRIAL_HEAT_PUMP_SCENARIOS = Object.freeze({
  base: createScenario(
    'Base example',
    'Illustrative food-processing assumptions.'
  ),
  conservative: createScenario(
    'Conservative case',
    'Higher assumed tariffs and cost, with tighter site limits.',
    {
      requiredSupplyTemperatureC: 135,
      electricityPricePerKwh: 0.22,
      heatPumpCop: 1.6,
      heatPumpMaxTemperatureC: 120,
      installedCost: 220000,
      annualMaintenanceCost: 9000,
      availableElectricalPowerKw: 35,
    }
  ),
  optimistic: createScenario(
    'Improved COP / temperature case',
    'Illustrative sensitivity case with higher assumed COP and temperature limit.',
    {
      electricityPricePerKwh: 0.15,
      heatPumpCop: 2.8,
      heatPumpMaxTemperatureC: 160,
      installedCost: 120000,
      annualMaintenanceCost: 3000,
    }
  ),
});

/**
 * Merge a sensitivity case with the shared synthetic process assumptions.
 * @param {string} label Short visible preset name.
 * @param {string} description Context shown after preset selection.
 * @param {Record<string,number>} [overrides] Assumptions changed by the preset.
 * @returns {HeatPumpScenario} Frozen scenario definition.
 */
function createScenario(label, description, overrides = {}) {
  return Object.freeze({
    label,
    description,
    inputs: Object.freeze({ ...BASE_INPUTS, ...overrides }),
  });
}
