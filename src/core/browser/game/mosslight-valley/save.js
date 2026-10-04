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
 * @param {string} game Save envelope game identity.
 * @returns {unknown} The computed result.
 */
export function serializeSave(state, slot = 0, game = 'mosslight-valley') {
  return JSON.stringify({
    game,
    version: 2,
    slot,
    savedAt: new Date(0).toISOString(),
    state,
  });
}
/**
 * Parse current or migrate the original v1 single-save envelope.
 * @param {unknown} raw - The raw argument.
 * @param {object} profile Optional episode identity and state contract.
 * @returns {unknown} The computed result.
 */
export function parseSave(raw, profile = {}) {
  const parsed = parseJsonOrNull(raw);
  if (!parsed || typeof parsed !== 'object') return null;
  if (
    parsed.game === profile.game &&
    parsed.version === 2 &&
    isValidState(parsed.state) &&
    profile.migrate
  ) {
    const state = profile.migrate(parsed.state);
    if (state !== parsed.state) {
      parsed.state = state;
      parsed.originalSave = raw;
    }
  }
  if (
    parsed.game === (profile.game || 'mosslight-valley') &&
    parsed.version === 2 &&
    isValidState(parsed.state) &&
    (!profile.validate || profile.validate(parsed.state))
  )
    return profile.restore
      ? { ...parsed, state: profile.restore(parsed.state) }
      : parsed;
  if (!profile.game && parsed.version === 1 && isValidState(parsed.state))
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
 * @param {object} profile Optional independent storage and save identity.
 * @returns {unknown} The computed result.
 */
export function createSaveAdapter(env, profile = {}) {
  const key = profile.key || KEY;
  const storage = env?.get?.('setLocalPermanentData');
  const loadAll = () => {
    const value = storage?.({})?.[key];
    return value && typeof value === 'object' ? value : { slots: {} };
  };
  const read = raw => {
    const parsed = parseSave(raw, profile);
    if (parsed?.originalSave) {
      const current = loadAll();
      const backups = current.migrationBackups || {};
      if (!Object.hasOwn(backups, parsed.slot))
        storage?.({
          [key]: {
            ...current,
            migrationBackups: { ...backups, [parsed.slot]: raw },
          },
        });
    }
    return parsed;
  };
  return {
    list: () =>
      Object.keys(loadAll().slots || {})
        .map(Number)
        .sort(),
    getActiveSlot: () => {
      const slot = loadAll().activeSlot;
      return Number.isInteger(slot) && slot >= 0 && slot <= 2 ? slot : 0;
    },
    load: (slot = 0) => read(loadAll().slots?.[slot])?.state || null,
    hasReset: id => Object.hasOwn(loadAll().resetReceipts || {}, id),
    save: (state, slot = 0, resetId, reset = false) => {
      const current = loadAll();
      const receipt = resetId
        ? { resetReceipts: { ...current.resetReceipts, [resetId]: true } }
        : {};
      const migrationBackups = { ...current.migrationBackups };
      if (reset) delete migrationBackups[slot];
      storage?.({
        [key]: {
          ...current,
          activeSlot: slot,
          ...receipt,
          ...(current.migrationBackups ? { migrationBackups } : {}),
          slots: {
            ...current.slots,
            [slot]: serializeSave(state, slot, profile.game),
          },
        },
      });
    },
    export: (state, slot = 0) => serializeSave(state, slot, profile.game),
    import: read,
  };
}
