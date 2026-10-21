import {
  createThreefoldCampaignOutcomesSaveStore,
  createThreefoldCampaignClockSaveStore,
  createThreefoldSimulationSaveStore,
  restoreThreefoldSimulation,
  serializeThreefoldSimulation,
} from './save.js';
import { THREEFOLD_SLUICE_SCENE_ID } from './sluice-scene.js';
import { THREEFOLD_SILT_MARGIN_SCENE_ID } from './silt-margin.js';
import { THREEFOLD_HEARTHGAPS_SCENE_ID } from './hearthgaps.js';
import {
  createThreefoldSimulation,
  isThreefoldGrainlandsSimulationState,
  isHighWorldSimulationState,
  isWeftwaysSimulationState,
  previewThreefoldGrowthEffects,
  getThreefoldWorldActionDurationSeconds,
  stepThreefoldSimulation,
} from './simulation.js';
import {
  advanceThreefoldCampaignClock,
  createThreefoldCampaignClock,
} from './campaign-clock.js';
import {
  createThreefoldCampaignOutcomes,
  recordThreefoldIriFate,
} from './campaign-outcomes.js';
import { renderThreefoldFrame } from './renderer.js';
import { isGatehouseRatInReach } from './encounter.js';
import { presentThreefoldWitnessEntry } from './witness-ledger.js';
import { THREEFOLD_BELLTOPS_SCENE_ID } from './belltops.js';
import {
  getThreefoldCampaignPlaces,
  getThreefoldHarborCampaignContent,
  THREEFOLD_CAMPAIGN_SCENE_IDS,
} from './campaign.js';

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
  const scene = opts.scene;
  const storage = opts.storage || createMapStorage(env);
  const createInitialState = () =>
    createThreefoldSimulation(CRISIS_THRESHOLDS, scene);
  const save =
    opts.save || createThreefoldSimulationSaveStore(storage, scene?.id);
  const campaignClockSave = createThreefoldCampaignClockSaveStore(storage);
  const campaignOutcomesSave =
    createThreefoldCampaignOutcomesSaveStore(storage);
  const brokenGateCampaignState =
    scene?.id === THREEFOLD_BELLTOPS_SCENE_ID
      ? createThreefoldSimulationSaveStore(storage).load()
      : null;
  const harborCampaign = getThreefoldHarborCampaignContent(
    brokenGateCampaignState
  );
  const savedCampaignRuns = Object.fromEntries(
    THREEFOLD_CAMPAIGN_SCENE_IDS.filter(
      sceneId => sceneId !== (scene?.id || 'broken-gate')
    ).map(sceneId => [
      sceneId,
      createThreefoldSimulationSaveStore(storage, sceneId).load(),
    ])
  );
  const loadInitialState = () => {
    const restored = save.load?.();
    return restored?.scene.id === (scene?.id || 'broken-gate')
      ? restored
      : createInitialState();
  };
  let state = loadInitialState();
  let campaignClock =
    campaignClockSave.load() || createThreefoldCampaignClock();
  let campaignOutcomes =
    campaignOutcomesSave.load() || createThreefoldCampaignOutcomes();
  let running = false;
  let accumulator = 0;
  let tick = 0;
  let previousActions = new Set();

  const campaignPlaces = () =>
    getThreefoldCampaignPlaces(
      { ...savedCampaignRuns, [state.scene.id]: state },
      state.scene.id
    );

  const frame = () => {
    const rendered = renderThreefoldFrame(state);
    return {
      ...rendered,
      threefold: {
        ...rendered.threefold,
        ...(harborCampaign || {}),
        campaignPlaces: campaignPlaces(),
        campaignClock: { ...campaignClock },
        campaignIriFate: campaignOutcomes.iriFate
          ? { ...campaignOutcomes.iriFate }
          : null,
      },
    };
  };
  const snapshot = () => ({
    ...state,
    tick,
    campaign: {
      places: campaignPlaces(),
      clock: { ...campaignClock },
      iriFate: campaignOutcomes.iriFate
        ? { ...campaignOutcomes.iriFate }
        : null,
    },
    world: {
      map: {
        name:
          state.scene.id === THREEFOLD_SLUICE_SCENE_ID
            ? 'THE TIDAL ARCHIVE'
            : state.scene.id === THREEFOLD_SILT_MARGIN_SCENE_ID
              ? 'THE SILT MARGIN'
              : state.scene.id === THREEFOLD_HEARTHGAPS_SCENE_ID
                ? 'HEARTHGAPS'
                : isWeftwaysSimulationState(state)
                  ? 'WEFTWAYS'
                  : isThreefoldGrainlandsSimulationState(state)
                    ? 'GRAINLANDS'
                    : isHighWorldSimulationState(state)
                      ? state.scene.displayName
                          .replace(/^The /, '')
                          .toUpperCase()
                      : 'THE BROKEN GATE',
      },
      day: 1,
      time:
        state.scene.id === THREEFOLD_SLUICE_SCENE_ID
          ? state.elapsedGameSeconds / 3600
          : state.scene.id === THREEFOLD_SILT_MARGIN_SCENE_ID
            ? state.elapsedGameSeconds / 3600
            : state.scene.id === THREEFOLD_HEARTHGAPS_SCENE_ID
              ? state.elapsedGameSeconds / 3600
              : isWeftwaysSimulationState(state)
                ? state.elapsedGameSeconds / 3600
                : isThreefoldGrainlandsSimulationState(state)
                  ? state.elapsedGameSeconds / 3600
                  : isHighWorldSimulationState(state)
                    ? state.elapsedGameSeconds / 3600
                    : state.crisis.elapsedMinutes / 60,
    },
  });

  /**
   * Apply one deterministic action from the current held/pressed input set.
   * @param {string[]} actions Current handheld actions.
   */
  function applyInput(actions) {
    const pressed = new Set(actions);
    /**
     * Apply one action using the current visible frame as pre-action knowledge.
     * @param {{type: string, direction?: string, elapsedGameMinutes?: number}} action Chosen normalized command.
     * @returns {ReturnType<typeof stepThreefoldSimulation>} Updated simulation state.
     */
    const dispatchAction = action =>
      applyWorldAction({ ...action, preActionFrame: frame() });
    const direction = DIRECTIONS.find(action => pressed.has(action));
    if (direction) state = dispatchAction({ type: 'move', direction });
    else if (pressed.has('a') && !previousActions.has('a')) {
      const growsThroughRat =
        previewThreefoldGrowthEffects(state).creatureIds.includes(
          'gatehouse-rat'
        );
      state = dispatchAction({
        type: growsThroughRat
          ? 'grow'
          : isGatehouseRatInReach(state)
            ? 'fight'
            : 'grow',
      });
    } else if (pressed.has('b') && !previousActions.has('b'))
      state = dispatchAction({ type: 'shrink' });
    else if (pressed.has('interact') && !previousActions.has('interact'))
      state = dispatchAction({ type: 'interact' });
    else if (pressed.has('x') && !previousActions.has('x'))
      state = dispatchAction(
        isGatehouseRatInReach(state)
          ? { type: 'bypass' }
          : { type: 'wait', elapsedGameMinutes: WAIT_MINUTES }
      );
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

  /**
   * Apply one player action and advance the independent campaign clock.
   * @param {{type: string, direction?: string, elapsedGameMinutes?: number, preActionFrame?: Record<string, any>}} action Normalized world action.
   * @returns {ReturnType<typeof stepThreefoldSimulation>} Updated simulation state.
   */
  function applyWorldAction(action) {
    const elapsedGameSeconds = getThreefoldWorldActionDurationSeconds(
      state,
      action
    );
    state = stepThreefoldSimulation(state, action);
    if (elapsedGameSeconds !== null) {
      campaignClock = advanceThreefoldCampaignClock(
        campaignClock,
        elapsedGameSeconds
      );
      campaignClockSave.save(campaignClock);
    }
    return state;
  }

  /**
   * Record a story-authored Iri outcome at the current campaign milestone.
   * @param {import('./campaign-outcomes.js').ThreefoldIriOutcome} outcome Resolved campaign state.
   * @param {string} milestoneId Stable identifier for the authored event.
   * @returns {boolean} Whether a valid outcome transition was persisted.
   */
  function recordIriFate(outcome, milestoneId) {
    const next = recordThreefoldIriFate(campaignOutcomes, {
      outcome,
      milestoneId,
      elapsedGameSeconds: campaignClock.elapsedGameSeconds,
    });
    if (JSON.stringify(next) === JSON.stringify(campaignOutcomes)) return false;
    campaignOutcomes = next;
    return campaignOutcomesSave.save(campaignOutcomes);
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
        applyWorldAction({
          ...normalized,
          preActionFrame: frame(),
        });
        save.save?.(state);
      }
      return frame();
    },
    getSnapshot: snapshot,
    getState: () => state,
    recordIriFate,
    getJournal: () =>
      (state.episode.witnessLedger || []).map(presentThreefoldWitnessEntry),
    save() {
      save.save?.(state);
      return state;
    },
    listSaves: () => [],
    loadSlot() {
      state = loadInitialState();
      return frame();
    },
    resetSave() {
      state = createInitialState();
      accumulator = 0;
      previousActions.clear();
      save.clear?.();
      save.save?.(state);
      return frame();
    },
    exportSave: () => serializeThreefoldSimulation(state),
    importSave(/** @type {unknown} */ serialized) {
      const restored = restoreThreefoldSimulation(serialized);
      if (!restored || restored.scene.id !== (scene?.id || 'broken-gate'))
        throw new Error('Invalid THREEFOLD save data.');
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
  if (
    ['move', 'grow', 'shrink', 'wait', 'interact', 'fight', 'bypass'].includes(
      action
    )
  )
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
