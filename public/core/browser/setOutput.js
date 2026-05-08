import { createSectionSetter } from './createSectionSetter.js';

const outputSetter = createSectionSetter('output');

export const setOutput = (input, env) => outputSetter(input, env);
