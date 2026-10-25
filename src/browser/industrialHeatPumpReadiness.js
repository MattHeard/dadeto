import { calculateIndustrialHeatPumpValues } from '../core/industrialHeatPumpReadiness.js';
import { buildIndustrialHeatPumpComparison } from './industrialHeatPump/comparison.js';
import { validateIndustrialHeatPumpInput } from './industrialHeatPump/validation.js';

/**
 * Validate external input, then run the pure comparison core.
 * @param {unknown} input Untrusted user-supplied screening input.
 * @returns {Record<string, any>} Explicit validation errors or the screening result.
 */
export function calculateIndustrialHeatPumpReadiness(input) {
  const errors = validateIndustrialHeatPumpInput(input);
  if (errors.length > 0) return { valid: false, errors };
  const assumptions = /** @type {Record<string, number>} */ (input);
  const values = calculateIndustrialHeatPumpValues(assumptions);
  const comparison = buildIndustrialHeatPumpComparison(assumptions, values);
  if (containsNonFiniteNumber(comparison))
    return {
      valid: false,
      errors: [{ field: 'input', code: 'calculation-not-finite' }],
    };
  return { valid: true, comparison };
}

/**
 * Reject numeric overflow in the trusted comparison's nested record schema.
 * Its values are numbers, status strings, and non-null nested records.
 * @param {Record<string,any>} comparison Calculated comparison record.
 * @returns {boolean} Whether a displayed or exported number is non-finite.
 */
function containsNonFiniteNumber(comparison) {
  return Object.values(comparison).some(value =>
    typeof value === 'number'
      ? !Number.isFinite(value)
      : typeof value === 'object' && containsNonFiniteNumber(value)
  );
}
