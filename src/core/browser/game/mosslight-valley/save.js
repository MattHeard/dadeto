import { parseJsonOrNull } from '../../validation.js';
const KEY = 'mosslight-valley-saves-v2';
/** @typedef {Record<string, any>} SaveState */
/** @typedef {{game?: string, key?: string, migrate?: (state: SaveState) => SaveState, validate?: (state: SaveState) => boolean, restore?: (state: SaveState) => SaveState}} SaveProfile */
/** @typedef {Record<string, any> & {game: string, version: number, slot: number, savedAt: string, state: SaveState, originalSave?: unknown}} SaveEnvelope */
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
 * @param {SaveState} state Game state to serialize.
 * @param {number} slot Save slot index.
 * @param {string} game Save envelope game identity.
 * @returns {string} Serialized save envelope.
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
 * @param {unknown} raw Serialized save data.
 * @param {SaveProfile} profile Optional episode identity and state contract.
 * @returns {SaveEnvelope | null} Parsed and validated envelope.
 */
export function parseSave(raw, profile = {}) {
  if (typeof raw !== 'string') return null;
  const parsed = /** @type {Record<string, any> | null} */ (
    parseJsonOrNull(raw)
  );
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
    return /** @type {SaveEnvelope} */ (
      profile.restore
        ? { ...parsed, state: profile.restore(parsed.state) }
        : parsed
    );
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
 * @param {unknown} state Candidate save state.
 * @returns {state is SaveState} Whether required world and inventory fields exist.
 */
function isValidState(state) {
  if (!state || typeof state !== 'object') return false;
  const candidate = /** @type {Record<string, any>} */ (state);
  return Boolean(
    candidate.world?.player &&
      typeof candidate.world.mapId === 'string' &&
      candidate.inventory &&
      typeof candidate.inventory === 'object'
  );
}
/**
 *
 * @param {SaveState} state Legacy version-one state.
 * @returns {SaveState} Migrated current state.
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
 * @param {Map<string, any>} env Runtime environment registry.
 * @param {SaveProfile} profile Optional independent storage and save identity.
 * @returns {Record<string, any>} Multi-slot save adapter.
 */
export function createSaveAdapter(env, profile = {}) {
  const key = profile.key || KEY;
  const storage = env?.get?.('setLocalPermanentData');
  const loadAll = () => {
    const value = storage?.({})?.[key];
    return value && typeof value === 'object' ? value : { slots: {} };
  };
  const read = (/** @type {unknown} */ raw) => {
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
    hasReset: (/** @type {string} */ id) =>
      Object.hasOwn(loadAll().resetReceipts || {}, id),
    save: (
      /** @type {SaveState} */ state,
      /** @type {number} */ slot = 0,
      /** @type {string | undefined} */ resetId,
      /** @type {boolean} */ reset = false
    ) => {
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
    export: (/** @type {SaveState} */ state, /** @type {number} */ slot = 0) =>
      serializeSave(state, slot, profile.game),
    import: read,
  };
}
