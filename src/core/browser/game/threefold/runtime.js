import {
  createThreefoldSimulationSaveStore,
  restoreThreefoldSimulation,
  serializeThreefoldSimulation,
} from './save.js';
import {
  createThreefoldSimulation,
  stepThreefoldSimulation,
} from './simulation.js';
import { renderThreefoldFrame } from './renderer.js';

const CRISIS_THRESHOLDS = {
  urgentAtMinutes: 4,
  surgeAtMinutes: 9,
  aftermathAtMinutes: 15,
};
const FIXED_STEP_MS = 125;
const WAIT_MINUTES = 15;
const DIRECTIONS = ['up', 'down', 'left', 'right'];

/**
 * Compose the deterministic Broken Gate simulation with handheld input and persistence.
 * @param {Record<string, any>|Map<string, any>} [options] Runtime dependencies.
 * @returns {Record<string, any>} Runtime lifecycle and state API.
 */
export function createThreefoldRuntime(options = {}) {
  const opts = options instanceof Map ? { env: options } : options;
  const env = opts.env || new Map();
  const save =
    opts.save ||
    createThreefoldSimulationSaveStore(opts.storage || createMapStorage(env));
  let state = save.load?.() || createThreefoldSimulation(CRISIS_THRESHOLDS);
  let running = false;
  let accumulator = 0;
  let tick = 0;
  let previousActions = new Set();

  const frame = () => renderThreefoldFrame(state);
  const snapshot = () => ({
    ...state,
    tick,
    world: {
      map: { name: 'THE BROKEN GATE' },
      day: 1,
      time: state.crisis.elapsedMinutes / 60,
    },
  });

  /**
   * Apply one deterministic action from the current held/pressed input set.
   * @param {string[]} actions Current handheld actions.
   */
  function applyInput(actions) {
    const pressed = new Set(actions);
    const direction = DIRECTIONS.find(action => pressed.has(action));
    if (direction)
      state = stepThreefoldSimulation(state, { type: 'move', direction });
    else if (pressed.has('a') && !previousActions.has('a'))
      state = stepThreefoldSimulation(state, { type: 'grow' });
    else if (pressed.has('b') && !previousActions.has('b'))
      state = stepThreefoldSimulation(state, { type: 'shrink' });
    else if (pressed.has('x') && !previousActions.has('x'))
      state = stepThreefoldSimulation(state, {
        type: 'wait',
        elapsedGameMinutes: WAIT_MINUTES,
      });
    else if (pressed.has('y') && !previousActions.has('y')) save.save?.(state);
    previousActions = pressed;
  }

  /**
   * Change the animation lifecycle and return the current frame.
   * @param {boolean} nextRunning Whether input and time should advance.
   * @returns {Record<string, any>} Current game frame.
   */
  function setRunning(nextRunning) {
    running = nextRunning;
    return frame();
  }

  return {
    start: () => setRunning(true),
    pause: () => setRunning(false),
    resume: () => setRunning(true),
    step(
      /** @type {number} */ deltaMs = FIXED_STEP_MS,
      /** @type {string[]} */ actions = []
    ) {
      if (!running) return frame();
      accumulator += Math.max(0, Math.min(deltaMs, 500));
      while (accumulator >= FIXED_STEP_MS) {
        const previousState = state;
        applyInput(actions);
        if (state !== previousState) save.save?.(state);
        accumulator -= FIXED_STEP_MS;
        tick += 1;
      }
      return frame();
    },
    dispatch(/** @type {string|Record<string, any>} */ command) {
      const action = typeof command === 'string' ? command : command?.type;
      const normalized = normalizeCommand(action, command);
      if (normalized) {
        state = stepThreefoldSimulation(state, normalized);
        save.save?.(state);
      }
      return frame();
    },
    getSnapshot: snapshot,
    getState: () => state,
    getJournal: () => [],
    save() {
      save.save?.(state);
      return state;
    },
    listSaves: () => [],
    loadSlot() {
      state = save.load?.() || createThreefoldSimulation(CRISIS_THRESHOLDS);
      return frame();
    },
    resetSave() {
      state = createThreefoldSimulation(CRISIS_THRESHOLDS);
      accumulator = 0;
      previousActions.clear();
      save.clear?.();
      save.save?.(state);
      return frame();
    },
    exportSave: () => serializeThreefoldSimulation(state),
    importSave(/** @type {unknown} */ serialized) {
      const restored = restoreThreefoldSimulation(serialized);
      if (!restored) throw new Error('Invalid THREEFOLD save data.');
      state = restored;
      save.save?.(state);
      return frame();
    },
    getSlot: () => 0,
    frame,
    isRunning: () => running,
  };
}

/**
 * Adapt the per-page in-memory environment to the save codec's storage boundary.
 * @param {Map<string, any>} env Runtime environment map.
 * @returns {{getItem: (key: string) => string|null, setItem: (key: string, value: string) => void, removeItem: (key: string) => boolean}} Map-backed storage.
 */
function createMapStorage(env) {
  return {
    getItem: key => env.get(key) ?? null,
    setItem: (key, value) => env.set(key, value),
    removeItem: key => env.delete(key),
  };
}

/**
 * Normalize named tool commands to the simulation's explicit command contract.
 * @param {unknown} action Candidate action name.
 * @param {any} command Original command payload.
 * @returns {{type: string, direction?: string, elapsedGameMinutes?: number}|null} Simulation command.
 */
function normalizeCommand(action, command) {
  if (typeof action !== 'string') return null;
  if (DIRECTIONS.includes(action)) return { type: 'move', direction: action };
  if (['move', 'grow', 'shrink', 'wait'].includes(action))
    return action === 'move'
      ? { type: 'move', direction: command.direction }
      : action === 'wait'
        ? {
            type: 'wait',
            elapsedGameMinutes: command.elapsedGameMinutes,
          }
        : { type: action };
  return null;
}
