import { safeParseJson } from '../../browser-core.js';
import {
  isValidStoryInput,
  persistDendriteStory,
  buildEmptyDendriteStoryResponse,
} from '../browserToysCore.js';

/**
 * Transform and store a Dendrite story submission.
 * @param {string} input - JSON string of a Dendrite story submission.
 * @param {import('../browserToysCore.js').ToyEnv} env - Environment providing getData/setLocalTemporaryData.
 * @returns {string} JSON string of the new objects.
 */
export function transformDendriteStory(input, env) {
  const parsed = safeParseJson(input, JSON.parse);
  if (!isValidStoryInput(parsed)) {
    return buildEmptyDendriteStoryResponse();
  }

  return persistDendriteStory(parsed, env);
}
