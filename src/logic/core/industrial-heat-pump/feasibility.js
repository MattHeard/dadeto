/**
 * Report independent engineering-limit and operating-cost statuses.
 * @param {import('./industrial-heat-pump.js').HeatPumpAssumptions} input Validated assumptions.
 * @param {import('./industrial-heat-pump.js').HeatPumpValues} values Pure core calculation values.
 * @returns {import('./industrial-heat-pump.js').HeatPumpFeasibility} Separated feasibility results.
 */
export function buildIndustrialHeatPumpFeasibility(input, values) {
  const hasPositiveSavings = values.annualOperatingSavings > 0;
  return {
    temperature: {
      status:
        input.requiredSupplyTemperatureC <= input.heatPumpMaxTemperatureC
          ? 'within-limit'
          : 'above-heat-pump-limit',
      requiredC: input.requiredSupplyTemperatureC,
      supportedMaximumC: input.heatPumpMaxTemperatureC,
    },
    electricalPower: {
      status:
        values.requiredElectricalPowerKw <= input.availableElectricalPowerKw
          ? 'within-limit'
          : 'insufficient-site-capacity',
      requiredKw: values.requiredElectricalPowerKw,
      availableKw: input.availableElectricalPowerKw,
    },
    economics: {
      status: hasPositiveSavings
        ? 'positive-operating-savings'
        : 'no-positive-operating-savings',
    },
    targetPayback: buildTargetPayback(input, values, hasPositiveSavings),
  };
}

/**
 * Keep the target-payback assessment separate from engineering capacity.
 * @param {import('./industrial-heat-pump.js').HeatPumpAssumptions} input Trusted assumptions.
 * @param {import('./industrial-heat-pump.js').HeatPumpValues} values Raw arithmetic values.
 * @param {boolean} positiveSavings Whether operating savings are positive.
 * @returns {import('./industrial-heat-pump.js').HeatPumpFeasibility['targetPayback']} Target status.
 */
function buildTargetPayback(input, values, positiveSavings) {
  return {
    status: !positiveSavings
      ? 'not-applicable'
      : values.simplePaybackYears <= input.targetPaybackYears
        ? 'meets-target'
        : 'exceeds-target',
    targetYears: input.targetPaybackYears,
  };
}
