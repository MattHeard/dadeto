/**
 * Convert raw threshold arithmetic into available/unavailable results.
 * @param {Record<string, number>} values Pure core calculation values.
 * @returns {Record<string, any>} Explicit threshold states.
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
