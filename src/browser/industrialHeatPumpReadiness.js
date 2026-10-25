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
  return {
    valid: true,
    comparison: buildIndustrialHeatPumpComparison(assumptions, values),
  };
}
