// @ts-nocheck -- save state is validated by normalization before runtime use.
import { parseJsonOrNull } from '../../validation.js';
const KEY = 'mosslight-valley-saves-v2';
/**
 * Explain exactly which local slot will be overwritten before a reset.
 * @param {number} slot Zero-based save slot.
 * @returns {string} Confirmation warning shared by both presenters.
 */
export function resetSavePrompt(slot = 0) {
  const label = String(Number(slot) + 1).padStart(2, '0');
  return `Reset save slot ${label} and start a new game? All progress in this slot will be erased. Other slots are safe. Export your save first if you want to keep a backup.`;
}
/**
 * Serialize one game state with a version and slot identity.
 * @param {unknown} state - The state argument.
 * @param {unknown} slot - The slot argument.
 * @returns {unknown} The computed result.
 */
export function serializeSave(state, slot = 0) {
  return JSON.stringify({
    game: 'mosslight-valley',
    version: 2,
    slot,
    savedAt: new Date(0).toISOString(),
    state,
  });
}
/**
 * Parse current or migrate the original v1 single-save envelope.
 * @param {unknown} raw - The raw argument.
 * @returns {unknown} The computed result.
 */
export function parseSave(raw) {
  const parsed = parseJsonOrNull(raw);
  if (!parsed || typeof parsed !== 'object') return null;
  if (
    parsed.game === 'mosslight-valley' &&
    parsed.version === 2 &&
    isValidState(parsed.state)
  )
    return parsed;
  if (parsed.version === 1 && isValidState(parsed.state))
    return {
      game: 'mosslight-valley',
      version: 2,
      slot: 0,
      savedAt: new Date(0).toISOString(),
      state: migrateV1(parsed.state),
    };
  return null;
}
/**
 *
 * @param {unknown} state - The state argument.
 * @returns {unknown} The computed result.
 */
function isValidState(state) {
  return Boolean(
    state &&
      typeof state === 'object' &&
      state.world?.player &&
      typeof state.world.mapId === 'string' &&
      state.inventory &&
      typeof state.inventory === 'object'
  );
}
/**
 *
 * @param {unknown} state - The state argument.
 * @returns {unknown} The computed result.
 */
function migrateV1(state) {
  const world = {
    ...state.world,
    mapId: state.world.location || 'village',
    flags: {},
    relationships: {},
    day: 1,
    weather: 'mist',
  };
  return {
    ...state,
    world,
    farm: { crop: null, plantedDay: null, wateredDay: null },
    journal: [],
    mode: 'world',
    lastActions: [],
    moveCooldown: 0,
  };
}
/**
 * Bind local multi-slot storage to Dadeto's persistent data helper.
 * @param {unknown} env - The env argument.
 * @returns {unknown} The computed result.
 */
export function createSaveAdapter(env) {
  const storage = env?.get?.('setLocalPermanentData');
  const loadAll = () => {
    const value = storage?.({})?.[KEY];
    return value && typeof value === 'object' ? value : { slots: {} };
  };
  return {
    list: () =>
      Object.keys(loadAll().slots || {})
        .map(Number)
        .sort(),
    load: (slot = 0) => parseSave(loadAll().slots?.[slot])?.state || null,
    save: (state, slot = 0) => {
      const current = loadAll();
      storage?.({
        [KEY]: {
          ...current,
          slots: { ...current.slots, [slot]: serializeSave(state, slot) },
        },
      });
    },
    export: (state, slot = 0) => serializeSave(state, slot),
    import: parseSave,
  };
}
