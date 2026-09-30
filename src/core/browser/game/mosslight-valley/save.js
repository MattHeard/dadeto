// @ts-nocheck -- runtime game state is intentionally data-driven.
/* eslint-disable jsdoc/require-returns -- compact game-state contracts are documented at module boundaries. */
import { parseJsonOrNull } from '../../validation.js';

const KEY = 'mosslight-valley-save-v1';
/** Serialize a versioned save payload. */
/** @param {object} state Game state. @returns {string} Serialized save. */
export function serializeSave(state) {
  return JSON.stringify({ version: 1, state });
}
/** Parse a versioned save payload or return null. */
/** @param {string} raw Serialized save. @returns {object|null} Parsed state. */
export function parseSave(raw) {
  const parsed = parseJsonOrNull(raw);
  return parsed?.version === 1 && parsed.state ? parsed.state : null;
}
/** Bind the save format to Dadeto permanent storage. */
/** @param {Map} env Runtime environment. @returns {object} Save adapter. */
export function createSaveAdapter(env) {
  const storage = env?.get?.('setLocalPermanentData');
  return {
    load: () => parseSave(storage?.({})?.[KEY]),
    save: state => storage?.({ [KEY]: serializeSave(state) }),
    export: serializeSave,
    import: parseSave,
  };
}
