import { mergeIntoStateProperty } from '../utils/stateMerge.js';

export function setOutput(input, env) {
  return mergeIntoStateProperty('output', input, env);
}
