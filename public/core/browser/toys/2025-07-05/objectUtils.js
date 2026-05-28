/**
 * Re-export object utility helpers for the add dendrite page toy.
 */
import {
  deepClone as deepCloneFromCore,
  mapValues as mapValuesFromCore,
  pick as pickFromCore,
} from '../../browser-core.js';

export const pick = pickFromCore;
export const mapValues = mapValuesFromCore;
export const deepClone = deepCloneFromCore;
