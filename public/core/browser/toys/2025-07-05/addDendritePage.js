import { safeParseJson } from '../../browser-core.js';
import {
  isValidPageInput,
  persistDendritePage,
  buildEmptyDendritePageResponse,
} from '../browserToysCore.js';

/**
 * Store a Dendrite page in temporary DEND2 storage.
 * @param {string} input - JSON string representing page data.
 * @param {import('../browserToysCore.js').ToyEnv} env - Environment with data helpers.
 * @returns {string} JSON string of the new page and options.
 */
export function addDendritePage(input, env) {
  const parsed = safeParseJson(input, JSON.parse);
  if (!isValidPageInput(parsed)) {
    return buildEmptyDendritePageResponse();
  }

  return persistDendritePage(parsed, env);
}
