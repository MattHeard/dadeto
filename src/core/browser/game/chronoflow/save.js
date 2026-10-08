import { createFluidState } from './chronoflow.js';
import {
  createChronoflowGame,
  openSluice,
  setChronoflowRoute,
} from './runtime.js';
import { tryOr } from '../../../commonCore.js';

const SAVE_KEY = 'dadeto.chronoflow.save.v1';
const SCHEMA_VERSION = 1;
const RULES_VERSION = 1;
const SOLVER_VERSION = 1;
const EDITABLE_CELLS = Object.freeze([7, 11]);
const INVALID_SAVE_JSON = Symbol('invalid-save-json');

/**
 * Serialize puzzle progress without trusting or retaining any clock state.
 * @param {import('./runtime.js').ChronoflowGame} game Current puzzle state.
 * @returns {string} Versioned JSON save.
 */
export function serializeChronoflowSave(game) {
  return JSON.stringify({
    schemaVersion: SCHEMA_VERSION,
    rulesVersion: RULES_VERSION,
    solverVersion: SOLVER_VERSION,
    level: game.level,
    fluid: game.fluid,
    gateOpen: game.gateOpen,
    route: game.route,
    completed: game.completed,
    editsUsed: game.editsUsed,
  });
}

/**
 * Restore a supported save as untimed practice, or reject untrusted data.
 * @param {string|null|undefined} serialized Stored JSON.
 * @returns {import('./runtime.js').ChronoflowGame|null} Safe practice state, or null.
 */
export function restoreChronoflowSave(serialized) {
  if (typeof serialized !== 'string') return null;
  const save = parseSaveJson(serialized);
  if (save === INVALID_SAVE_JSON) return null;
  if (!isSupportedSave(save)) return null;
  const restored = safelyRestoreGame(save);
  return restored === INVALID_SAVE_JSON ? null : restored;
}

/**
 * Create an isolated local-storage adapter for Chronoflow saves.
 * @param {{getItem: (key: string) => string|null, setItem: (key: string, value: string) => void, removeItem?: (key: string) => void}|null|undefined} storage Browser storage implementation.
 * @returns {{load: () => import('./runtime.js').ChronoflowGame|null, save: (game: import('./runtime.js').ChronoflowGame) => boolean, clear: () => boolean}} Persistence operations.
 */
export function createChronoflowSaveStore(storage) {
  return {
    load: () =>
      /** @type {import('./runtime.js').ChronoflowGame | null} */ (
        tryOr(
          () => restoreChronoflowSave(storage?.getItem(SAVE_KEY)),
          () => null
        )
      ),
    save: game =>
      performStorageOperation(
        storage,
        'setItem',
        serializeChronoflowSave(game)
      ),
    clear: () => performStorageOperation(storage, 'removeItem'),
  };
}

/**
 * @param {string} serialized Stored JSON.
 * @returns {unknown|typeof INVALID_SAVE_JSON} Parsed payload or invalid marker.
 */
function parseSaveJson(serialized) {
  return safelyRun(() => JSON.parse(serialized));
}

/**
 * Turn any solver or terrain validation exception into an invalid-save marker.
 * @param {Record<string, any>} save Supported save envelope.
 * @returns {import('./runtime.js').ChronoflowGame|typeof INVALID_SAVE_JSON} Restored game or invalid marker.
 */
function safelyRestoreGame(save) {
  return safelyRun(() => restoreGame(save));
}

/**
 * @template T
 * Convert an untrusted parse or validation exception into a marker.
 * @param {() => T} operation Operation that may throw.
 * @returns {T|typeof INVALID_SAVE_JSON} Its value or the invalid marker.
 */
function safelyRun(operation) {
  try {
    return operation();
  } catch {
    return INVALID_SAVE_JSON;
  }
}

/**
 * Perform one optional browser storage mutation without blocking practice.
 * @param {{setItem?: (key: string, value: string) => void, removeItem?: (key: string) => void}|null|undefined} storage Storage implementation.
 * @param {'setItem'|'removeItem'} operation Mutation to perform.
 * @param {string} [value] Serialized save for setItem.
 * @returns {boolean} Whether storage accepted the mutation.
 */
function performStorageOperation(storage, operation, value) {
  try {
    if (operation === 'setItem') {
      if (typeof storage?.setItem !== 'function' || value === undefined) {
        return false;
      }
      storage.setItem(SAVE_KEY, value);
    } else {
      if (typeof storage?.removeItem !== 'function') return false;
      storage.removeItem(SAVE_KEY);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {unknown} value Candidate save.
 * @returns {value is Record<string, any>} Whether envelope versions and fields are supported.
 */
function isSupportedSave(value) {
  if (value === null || typeof value !== 'object') return false;
  const candidate = /** @type {Record<string, any>} */ (value);
  return (
    candidate.schemaVersion === SCHEMA_VERSION &&
    candidate.rulesVersion === RULES_VERSION &&
    candidate.solverVersion === SOLVER_VERSION &&
    candidate.level === 'archive-entry' &&
    typeof candidate.gateOpen === 'boolean' &&
    (candidate.route === 'archive' || candidate.route === 'drain') &&
    typeof candidate.completed === 'boolean' &&
    Number.isSafeInteger(candidate.editsUsed) &&
    candidate.editsUsed >= 0 &&
    candidate.editsUsed <= 3 &&
    candidate.fluid &&
    typeof candidate.fluid === 'object'
  );
}

/**
 * Rebuild the saved solver state after checking level geometry and invariants.
 * @param {Record<string, any>} save Supported save envelope.
 * @returns {import('./runtime.js').ChronoflowGame} Restored practice game.
 */
function restoreGame(save) {
  if (
    !Array.isArray(save.fluid.volume) ||
    !Array.isArray(save.fluid.velocityX) ||
    !Array.isArray(save.fluid.velocityY) ||
    !Array.isArray(save.fluid.solids) ||
    save.fluid.volume.length !== 20 ||
    save.fluid.velocityX.length !== 20 ||
    save.fluid.velocityY.length !== 20 ||
    save.fluid.solids.length !== 20
  ) {
    throw new RangeError('Saved fluid arrays violate Chronoflow bounds.');
  }
  const fluid = createFluidState({
    width: save.fluid.width,
    height: save.fluid.height,
    viscosity: save.fluid.viscosity,
    volume: save.fluid.volume,
    velocityX: save.fluid.velocityX,
    velocityY: save.fluid.velocityY,
    solids: save.fluid.solids,
  });
  if (
    fluid.width !== 5 ||
    fluid.height !== 4 ||
    !Number.isSafeInteger(save.fluid.tick) ||
    save.fluid.tick < 0 ||
    fluid.solids.some((solid, cell) =>
      solid ? fluid.volume[cell] !== 0 : false
    )
  ) {
    throw new RangeError('Saved fluid arrays violate Chronoflow bounds.');
  }
  const expected = setChronoflowRoute(createChronoflowGame(), save.route);
  const withGate = save.gateOpen ? openSluice(expected) : expected;
  let changedEditableCells = false;
  for (let cell = 0; cell < fluid.solids.length; cell += 1) {
    if (
      EDITABLE_CELLS.includes(cell) &&
      fluid.solids[cell] !== withGate.fluid.solids[cell]
    ) {
      changedEditableCells = true;
    }
    if (
      !EDITABLE_CELLS.includes(cell) &&
      fluid.solids[cell] !== withGate.fluid.solids[cell]
    ) {
      throw new RangeError('Saved terrain does not match the authored level.');
    }
  }
  if (changedEditableCells && save.editsUsed === 0) {
    throw new RangeError('Saved terrain changes require an edit.');
  }
  const targetFilled =
    fluid.volume[withGate.targetCell] >= withGate.targetVolume;
  if (save.completed !== targetFilled) {
    throw new RangeError('Saved completion does not match its target volume.');
  }
  return {
    ...withGate,
    fluid: { ...fluid, tick: save.fluid.tick },
    completed: save.completed,
    timedCredit: false,
    mode: 'practice',
    editsUsed: save.editsUsed,
  };
}
