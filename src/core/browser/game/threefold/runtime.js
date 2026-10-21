import {
  applyThreefoldQuayInteraction,
  getThreefoldQuayContent,
  hasThreefoldQuayIriDeath,
} from './quay-regulator.js';
import {
  advanceThreefoldPressureNetwork,
  createThreefoldPressureNetwork,
  describeThreefoldPressureNetwork,
} from './pressure-network.js';
import {
  THREEFOLD_GRAINLANDS_HATCH_ID,
  THREEFOLD_GRAINLANDS_NURSERY_ID,
} from './grainlands.js';
import { isThreefoldInteractableInReach } from './scene-utils.js';
import {
  createThreefoldPressureNetworkSaveStore,
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
import {
  THREEFOLD_BELLTOPS_IRI_ID,
  THREEFOLD_BELLTOPS_SCENE_ID,
} from './belltops.js';
import {
  getThreefoldCampaignPlaces,
  getThreefoldCampaignPressureState,
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
  const pressureSave = createThreefoldPressureNetworkSaveStore(storage);
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
  let pressureNetwork = pressureSave.load() || createThreefoldPressureNetwork();
  let running = false;
  let accumulator = 0;
  let tick = 0;
  let previousActions = new Set();

  const campaignPlaces = () =>
    getThreefoldCampaignPlaces(
      { ...savedCampaignRuns, [state.scene.id]: state },
      state.scene.id
    );
  const quayContent = () =>
    getThreefoldQuayContent(state, pressureNetwork, campaignOutcomes.iriFate);
  const campaignPressure = () => {
    const sites = getThreefoldCampaignPressureState({
      ...savedCampaignRuns,
      [state.scene.id]: state,
    });
    if (campaignPlaces().some(place => place.id === 'grainlands'))
      sites.push({
        id: 'grainlands-shelter',
        label: describeThreefoldPressureNetwork(pressureNetwork),
        state: pressureNetwork.nurseryFlooded ? 'flooded' : 'dry',
      });
    const quay = quayContent();
    if (quay)
      sites.push({
        id: 'quay-machinery',
        label: quay.text,
        state: quay.craneAvailable ? 'available' : 'unavailable',
      });
    return sites;
  };

  const frame = () => {
    const quay = quayContent();
    const rendered = renderThreefoldFrame(state, pressureNetwork, quay);
    return {
      ...rendered,
      threefold: {
        ...rendered.threefold,
        ...(harborCampaign || {}),
        quayRegulator: quay,
        campaignPlaces: campaignPlaces(),
        campaignPressure: campaignPressure(),
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
      pressure: campaignPressure(),
      network: {
        ...pressureNetwork,
        volumesCubicMeters: [...pressureNetwork.volumesCubicMeters],
      },
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
    const quayAction =
      action.type === 'interact'
        ? applyThreefoldQuayInteraction(
            state,
            pressureNetwork,
            campaignOutcomes.iriFate
          )
        : null;
    const hadIriGrowthDeath = hasThreefoldQuayIriDeath(state);
    state = stepThreefoldSimulation(state, action);
    if (elapsedGameSeconds !== null) {
      campaignClock = advanceThreefoldCampaignClock(
        campaignClock,
        elapsedGameSeconds
      );
      campaignClockSave.save(campaignClock);
    }
    const hasIriGrowthDeath = hasThreefoldQuayIriDeath(state);
    if (quayAction?.outcome) {
      recordIriFate(quayAction.outcome, quayAction.milestoneId);
    } else if (
      action.type === 'grow' &&
      !hadIriGrowthDeath &&
      hasIriGrowthDeath
    ) {
      recordIriFate('dead', 'quay-regulator-growth');
    }
    if (elapsedGameSeconds !== null)
      synchronizePressureNetwork(
        action,
        elapsedGameSeconds,
        quayAction?.network || pressureNetwork
      );
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
    projectCampaignIri();
    return campaignOutcomesSave.save(campaignOutcomes);
  }

  /**
   * Apply observed route controls to the shared water and retain permanent damage.
   * @param {{type: string}} action Explicit action, or a zero-duration load marker.
   * @param {number} durationSeconds Elapsed deterministic game seconds.
   * @param {import('./pressure-network.js').ThreefoldPressureNetwork} [base] Current action machinery changes before water advances.
   * @returns {void}
   */
  function synchronizePressureNetwork(
    action,
    durationSeconds,
    base = pressureNetwork
  ) {
    const runs =
      /** @type {Record<string, ReturnType<typeof createThreefoldSimulation>|null>} */ ({
        ...savedCampaignRuns,
        [state.scene.id]: state,
      });
    const facts = getThreefoldCampaignPressureState(runs);
    const nursery = runs.grainlands;
    const quay = runs.belltops;
    const nextPressureNetwork = advanceThreefoldPressureNetwork(
      base,
      {
        craneDestroyed:
          quay?.player.destroyedGeometryIds.includes('belltops-harbor-crane') ||
          false,
        regulatorFailed: facts.some(
          site => site.id === 'belltops-quay' && site.state === 'damaged'
        ),
        nurseryDamaged:
          nursery?.player.destroyedGeometryIds.includes(
            THREEFOLD_GRAINLANDS_NURSERY_ID
          ) || false,
        closeHatch:
          action.type === 'interact' &&
          isThreefoldInteractableInReach(state, THREEFOLD_GRAINLANDS_HATCH_ID),
        coordinatedBypass:
          facts.some(
            site =>
              site.id === 'hearthgaps-runoff' && site.state === 'shared-bypass'
          ) &&
          facts.some(
            site => site.id === 'silt-margin-choir' && site.state === 'sent'
          ),
      },
      durationSeconds
    );
    if (
      JSON.stringify(nextPressureNetwork) !== JSON.stringify(pressureNetwork)
    ) {
      pressureNetwork = nextPressureNetwork;
      pressureSave.save(pressureNetwork);
    }
    projectPressureDamage();
    projectCampaignIri();
  }

  /**
   * Keep a region reload or reset consistent with permanent campaign structures.
   * @returns {void}
   */
  function projectPressureDamage() {
    const damage = [
      {
        sceneId: 'belltops',
        id: 'belltops-pressure-regulator',
        active: pressureNetwork.regulatorFailed,
      },
      {
        sceneId: 'belltops',
        id: 'belltops-harbor-crane',
        active: pressureNetwork.craneDestroyed,
      },
      {
        sceneId: 'grainlands',
        id: THREEFOLD_GRAINLANDS_NURSERY_ID,
        active: pressureNetwork.nurseryDamaged,
      },
    ].filter(
      item =>
        item.sceneId === state.scene.id &&
        item.active &&
        !state.player.destroyedGeometryIds.includes(item.id)
    );
    if (damage.length === 0) return;
    state = {
      ...state,
      player: {
        ...state.player,
        destroyedGeometryIds: [
          ...state.player.destroyedGeometryIds,
          ...damage.map(item => item.id),
        ].sort(),
      },
    };
  }

  /**
   * Keep departed Iri out of later collision previews without inventing a death.
   * Preserve a locally recorded growth corpse; a region reset cannot revive it.
   * @returns {void}
   */
  function projectCampaignIri() {
    const fate = campaignOutcomes.iriFate;
    if (!fate && !pressureNetwork.operatorReleased) return;
    const outcome = fate?.outcome || '';
    const hasLocalDeath = hasThreefoldQuayIriDeath(state);
    const departed =
      pressureNetwork.operatorReleased ||
      ['rescued', 'escaped', 'evacuated'].includes(outcome) ||
      (outcome === 'dead' && !hasLocalDeath);
    if (!departed) return;
    const residents = /** @type {Array<{id: string}>} */ (
      state.scene.creatures
    );
    const creatures = residents.filter(
      creature => creature.id !== THREEFOLD_BELLTOPS_IRI_ID
    );
    if (creatures.length === state.scene.creatures.length) return;
    state = /** @type {typeof state} */ ({
      ...state,
      scene: { ...state.scene, creatures },
    });
  }

  synchronizePressureNetwork({ type: 'load' }, 0);

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
      synchronizePressureNetwork({ type: 'load' }, 0);
      return frame();
    },
    resetSave() {
      state = createInitialState();
      synchronizePressureNetwork({ type: 'reset' }, 0);
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
      synchronizePressureNetwork({ type: 'import' }, 0);
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
