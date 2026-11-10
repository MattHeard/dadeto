/** @typedef {{sector?:string,process?:string,inputs?:string[],outputs?:string[]}} IndustrialHeatPumpEntityReferences */
/** @typedef {{label:string,description:string,inputs:Readonly<import('./industrial-heat-pump.js').HeatPumpAssumptions>,industryGraphReferences?:IndustrialHeatPumpEntityReferences}} HeatPumpScenario */

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
 * Original ordered assumption metadata shared by form bindings and presentation.
 * @type {Readonly<Array<keyof import('./industrial-heat-pump.js').HeatPumpAssumptions>>}
 */
export const HEAT_PUMP_FIELD_NAMES =
  /** @type {Array<keyof import('./industrial-heat-pump.js').HeatPumpAssumptions>} */ (
    Object.keys(BASE_INPUTS)
  );

/**
 * Merge a sensitivity case with the shared synthetic process assumptions.
 * @param {string} label Short visible preset name.
 * @param {string} description Context shown after preset selection.
 * @param {Partial<import('./industrial-heat-pump.js').HeatPumpAssumptions>} [overrides] Assumptions changed by the preset.
 * @returns {HeatPumpScenario} Frozen scenario definition.
 */
function createScenario(label, description, overrides = {}) {
  return Object.freeze({
    label,
    description,
    inputs: Object.freeze({ ...BASE_INPUTS, ...overrides }),
  });
}

/**
 * Build a portable screening scenario from trusted assumptions and results.
 * Graph references are optional opaque entity IDs and do not affect arithmetic.
 * @template Name, Assumptions, Result, References
 * @param {{scenarioName:Name,assumptions:Assumptions,result:Result,industryGraphReferences?:References}} scenario Trusted scenario slots with optional opaque graph links.
 * @returns {{schemaVersion: number, scenarioName: Name, assumptions: Assumptions, result: Result, industryGraphReferences?: References, disclosure: string}} Version-one portable screening record retaining aliases.
 */
export function createIndustrialHeatPumpScenarioExport(scenario) {
  return {
    schemaVersion: 1,
    scenarioName: scenario.scenarioName,
    assumptions: scenario.assumptions,
    result: scenario.result,
    ...(scenario.industryGraphReferences
      ? { industryGraphReferences: scenario.industryGraphReferences }
      : {}),
    disclosure:
      'Hypothetical user-supplied screening calculation; not engineering advice or evidence of commercially available equipment.',
  };
}
