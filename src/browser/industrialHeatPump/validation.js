const RULES = [
  ['requiredSupplyTemperatureC', 0, 300],
  ['annualUsefulHeatKwh', 0, null, true],
  ['annualOperatingHours', 0, 8760, true],
  ['incumbentFuelPricePerKwh', 0],
  ['incumbentEfficiency', 0, 1, true],
  ['electricityPricePerKwh', 0],
  ['heatPumpCop', 0, null, true],
  ['heatPumpMaxTemperatureC', 0, 300],
  ['installedCost', 0],
  ['annualMaintenanceCost', 0],
  ['availableElectricalPowerKw', 0],
  ['targetPaybackYears', 0, null, true],
];

/**
 * Validate unit-labelled numeric inputs at the browser boundary.
 * @param {unknown} input Untrusted scenario fields.
 * @returns {Array<{field: string, code: string}>} Stable input issues.
 */
export function validateIndustrialHeatPumpInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    return [{ field: 'input', code: 'object-required' }];
  const record = /** @type {Record<string, unknown>} */ (input);
  const errors = [];
  for (const [field, minimum, maximum, exclusive] of RULES) {
    if (!Object.hasOwn(record, field)) errors.push({ field, code: 'required' });
    else if (typeof record[field] !== 'number' || !Number.isFinite(record[field]))
      errors.push({ field, code: 'finite-number-required' });
    else if (exclusive ? record[field] <= minimum : record[field] < minimum)
      errors.push({ field, code: 'below-minimum' });
    else if (maximum !== null && maximum !== undefined && record[field] > maximum)
      errors.push({ field, code: 'above-maximum' });
  }
  return errors;
}
