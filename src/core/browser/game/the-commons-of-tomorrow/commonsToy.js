import { mosslightValley } from '../mosslight-valley/mosslightValley.js';
import { createCommonsRuntime } from './runtime.js';

/**
 * Run one synchronous embedded Commons game step.
 * @param {string} input Serialized controller action or save command.
 * @param {Map<string, unknown>} env Runtime environment and local persistence adapter.
 * @returns {string} Serialized 160x144 pixel frame payload.
 */
export function commonsToy(input, env) {
  return mosslightValley(input, env, createCommonsRuntime);
}

export { createCommonsRuntime } from './runtime.js';
export { COMMONS_CONTENT } from './content.js';
