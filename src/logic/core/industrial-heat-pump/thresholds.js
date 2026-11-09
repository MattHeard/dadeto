/**
 * Convert raw threshold arithmetic into available/unavailable results.
 * @param {import('./industrial-heat-pump.js').HeatPumpValues} values Pure core calculation values.
 * @returns {import('./industrial-heat-pump.js').HeatPumpThresholds} Explicit threshold states.
 */
export function buildIndustrialHeatPumpThresholds(values) {
  return {
    minimumCopForTargetPayback:
      values.allowedElectricityCost > 0
        ? { status: 'available', value: values.minimumCopForTargetPayback }
        : { status: 'not-achievable' },
    maximumInstalledCostForTargetPayback:
      values.annualOperatingSavings > 0
        ? {
            status: 'available',
            value: values.maximumInstalledCostForTargetPayback,
          }
        : { status: 'not-achievable' },
  };
}
