import { registerSubmitNewStoryEndpoint as createEndpoint } from './startup-effect-adapter.js';

/** @param {import('../../../types/allow-effects').AllowEffects} allowEffects @param {unknown} db @param {string} id @param {unknown} data */
export async function saveSubmitNewStory(allowEffects, db, id, data) {
  void allowEffects;
  await /** @type {any} */ (db)
    .collection('storyFormSubmissions')
    .doc(id)
    .set(data);
}

/** @param {import('../../../types/allow-effects').AllowEffects} allowEffects @param {any} response @param {number} status @param {unknown} body */
export function sendSubmitNewStoryResponse(allowEffects, response, status, body) {
  void allowEffects;
  return response.status(status).json(body);
}

/** @param {import('../../../types/allow-effects').AllowEffects} allowEffects @param {(...values: unknown[]) => void} logger @param {...unknown} values */
export function logSubmitNewStory(allowEffects, logger, ...values) {
  void allowEffects;
  return logger(...values);
}

/** @param {import('../../../types/allow-effects').AllowEffects} allowEffects @param {(error?: unknown) => void} next @param {unknown} error */
export function forwardSubmitNewStoryCorsError(allowEffects, next, error) {
  void allowEffects;
  return next(error);
}

export const registerSubmitNewStoryEndpoint = createEndpoint;
