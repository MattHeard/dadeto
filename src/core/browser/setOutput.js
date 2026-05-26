import { createSectionSetter } from './createSectionSetter.js';

const outputSetter = createSectionSetter('output');

/**
 * Set the output section in the current environment.
 * @param {string} input - JSON payload to merge.
 * @param {Map<string, Function>} env - Environment helpers.
 * @returns {string} Merge status message.
 */
export const setOutput = (input, env) => outputSetter(input, env);
