import { parseIndustrialHeatPumpInput } from '../logic/boundary/industrial-heat-pump/input.js';
import { calculateTrustedIndustrialHeatPump } from '../logic/core/industrial-heat-pump/industrial-heat-pump.js';

/**
 * Compose total boundary interpretation with trusted screening computation.
 * @param {unknown} input Untrusted user-supplied screening input.
 * @returns {import('../logic/core/industrial-heat-pump/industrial-heat-pump.js').HeatPumpPublicResult} Existing public result or original thrown value.
 */
export function calculateIndustrialHeatPumpReadiness(input) {
  const parsed = parseIndustrialHeatPumpInput(input);
  if (!parsed.ok) throw parsed.error;
  return parsed.evidence.valid
    ? calculateTrustedIndustrialHeatPump(parsed.evidence.assumptions)
    : parsed.evidence;
}
