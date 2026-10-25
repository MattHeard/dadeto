/**
 * Report independent engineering-limit and operating-cost statuses.
 * @param {Record<string, number>} input Validated assumptions.
 * @param {Record<string, number>} values Pure core calculation values.
 * @returns {Record<string, any>} Separated feasibility results.
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
