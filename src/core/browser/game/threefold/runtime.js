import { projectThreefoldCampaignState } from './campaign-projection.js';
import {
  createThreefoldCampaignStorage,
  getThreefoldRegionRecordKey,
} from './campaign-storage.js';
import {
  restoreThreefoldCampaignBackup,
  serializeThreefoldRuntimeCampaign,
} from './campaign-backup.js';
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
import { THREEFOLD_BELLTOPS_SCENE_ID } from './belltops.js';
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
  const storage = createThreefoldCampaignStorage(
    'storage' in opts ? opts.storage : createMapStorage(env)
  );
  const createInitialState = () =>
    createThreefoldSimulation(CRISIS_THRESHOLDS, scene);
  const save =
    opts.save || createThreefoldSimulationSaveStore(storage, scene?.id);
  const campaignClockSave = createThreefoldCampaignClockSaveStore(storage);
  const pressureSave = createThreefoldPressureNetworkSaveStore(storage);
  const campaignOutcomesSave =
    createThreefoldCampaignOutcomesSaveStore(storage);
  let harborCampaign = loadHarborCampaign(storage, scene?.id);
  let savedCampaignRuns = loadSavedCampaignRuns(
    storage,
    scene?.id || 'broken-gate'
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
  let revision = storage.readCampaign().revision;
  let inAction = false;
  let running = false;
  let accumulator = 0;
  let tick = 0;
  let previousActions = new Set();

  /**
   * Refresh stale pages before any read or mutation; retain unsaved local play.
   * @param {boolean} [force] Whether an explicit complete restore replaced storage.
   * @returns {void}
   */
  function refreshCampaign(force = false) {
    if (inAction) return;
    const document = storage.readCampaign();
    if (!force && document.revision === revision) return;
    revision = document.revision;
    state =
      restoreThreefoldSimulation(
        document.records[
          getThreefoldRegionRecordKey(scene?.id || 'broken-gate')
        ]
      ) || (force ? createInitialState() : loadInitialState());
    campaignClock = campaignClockSave.load() || createThreefoldCampaignClock();
    campaignOutcomes =
      campaignOutcomesSave.load() || createThreefoldCampaignOutcomes();
    pressureNetwork = pressureSave.load() || createThreefoldPressureNetwork();
    savedCampaignRuns = loadSavedCampaignRuns(storage, state.scene.id);
    harborCampaign = loadHarborCampaign(storage, state.scene.id);
    projectCampaignState();
  }

  /** @returns {void} Apply permanent campaign facts to the current region. */
  function projectCampaignState() {
    state = projectThreefoldCampaignState(
      state,
      pressureNetwork,
      campaignOutcomes
    );
  }

  /**
   * Persist shared and regional progress together after one logical action.
   * @template T
   * @param {() => T} action Deterministic state update.
   * @returns {T} Action result, retained locally if persistence fails.
   */
  function campaignAction(action) {
    refreshCampaign();
    const before = { state, campaignClock, campaignOutcomes, pressureNetwork };
    inAction = true;
    try {
      const result = storage.transaction(() => {
        const value = action();
        campaignClockSave.save(campaignClock);
        campaignOutcomesSave.save(campaignOutcomes);
        pressureSave.save(pressureNetwork);
        save.save?.(state);
        return value;
      });
      revision = storage.readCampaign().revision;
      return result.value;
    } catch (error) {
      ({ state, campaignClock, campaignOutcomes, pressureNetwork } = before);
      throw error;
    } finally {
      inAction = false;
    }
  }

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
    refreshCampaign();
    const quay = quayContent();
    const rendered = renderThreefoldFrame(state, pressureNetwork, quay);
    return {
      ...rendered,
      threefold: {
        ...rendered.threefold,
        ...(harborCampaign || {}),
        quayRegulator: quay,
        campaignPersistence: storage.getStatus(),
        campaignPlaces: campaignPlaces(),
        campaignPressure: campaignPressure(),
        campaignClock: { ...campaignClock },
        campaignIriFate: campaignOutcomes.iriFate
          ? { ...campaignOutcomes.iriFate }
          : null,
      },
    };
  };
  const snapshot = () => {
    refreshCampaign();
    return {
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
    };
  };

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
    else if (pressed.has('y') && !previousActions.has('y'))
      campaignAction(() => state);
    previousActions = pressed;
  }

  /**
   * Change the animation lifecycle and return the current frame.
   * @param {boolean} nextRunning Whether input and time should advance.
   * @returns {Record<string, any>} Current game frame.
   */
  function setRunning(nextRunning) {
    refreshCampaign();
    running = nextRunning;
    return frame();
  }

  /**
   * Apply one player action and advance the independent campaign clock.
   * @param {{type: string, direction?: string, elapsedGameMinutes?: number, preActionFrame?: Record<string, any>}} action Normalized world action.
   * @returns {ReturnType<typeof stepThreefoldSimulation>} Updated simulation state.
   */
  function applyWorldAction(action) {
    return campaignAction(() => updateWorldAction(action));
  }

  /**
   * Update a world inside the campaign transaction.
   * @param {Parameters<typeof applyWorldAction>[0]} action Explicit command.
   * @returns {ReturnType<typeof stepThreefoldSimulation>} Updated region.
   */
  function updateWorldAction(action) {
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
    projectCampaignState();
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
    projectCampaignState();
  }

  /** @returns {Record<string, any>} Restored frame with no held action carried over. */
  function resetInputFrame() {
    accumulator = 0;
    previousActions.clear();
    return frame();
  }

  campaignAction(() => synchronizePressureNetwork({ type: 'load' }, 0));

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
        refreshCampaign();
        applyInput(actions);
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
      }
      return frame();
    },
    getSnapshot: snapshot,
    getState: () => {
      refreshCampaign();
      return state;
    },
    recordIriFate: (
      /** @type {import('./campaign-outcomes.js').ThreefoldIriOutcome} */ outcome,
      /** @type {string} */ milestoneId
    ) => {
      const changed = campaignAction(() => recordIriFate(outcome, milestoneId));
      return changed && !storage.getStatus().dirty;
    },
    getJournal: () => {
      refreshCampaign();
      return (state.episode.witnessLedger || []).map(
        presentThreefoldWitnessEntry
      );
    },
    getPersistenceStatus: storage.getStatus,
    save() {
      campaignAction(() => state);
      return state;
    },
    listSaves: () => [],
    loadSlot() {
      campaignAction(() => {
        state = loadInitialState();
        synchronizePressureNetwork({ type: 'load' }, 0);
      });
      return frame();
    },
    resetSave() {
      campaignAction(() => {
        state = createInitialState();
        synchronizePressureNetwork({ type: 'reset' }, 0);
      });
      return resetInputFrame();
    },
    exportSave: () => {
      refreshCampaign();
      return serializeThreefoldSimulation(state);
    },
    exportCampaign() {
      refreshCampaign();
      return serializeThreefoldRuntimeCampaign(
        storage.readCampaign().records,
        state,
        snapshot().campaign
      );
    },
    importCampaign(/** @type {unknown} */ serialized) {
      const records = restoreThreefoldCampaignBackup(serialized);
      if (!storage.replaceCampaign(records))
        throw new Error('Campaign backup could not be saved on this device.');
      refreshCampaign(true);
      return resetInputFrame();
    },
    importSave(/** @type {unknown} */ serialized) {
      const restored = restoreThreefoldSimulation(serialized);
      if (!restored || restored.scene.id !== (scene?.id || 'broken-gate'))
        throw new Error('Invalid THREEFOLD save data.');
      campaignAction(() => {
        if (
          hasThreefoldQuayIriDeath(restored) &&
          campaignOutcomes.iriFate &&
          campaignOutcomes.iriFate.outcome !== 'dead'
        )
          throw new Error(
            'Regional save conflicts with campaign character outcomes.'
          );
        state = restored;
        synchronizePressureNetwork({ type: 'import' }, 0);
      });
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
 * @returns {{getItem: (key: string) => string|null, setItem: (key: string, value: string) => void}} Map-backed storage.
 */
function createMapStorage(env) {
  return {
    getItem: key => env.get(key) ?? null,
    setItem: (key, value) => env.set(key, value),
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

/**
 * Read each other authored region through the same campaign storage boundary.
 * @param {import('./campaign-storage.js').ThreefoldCampaignStorage} storage Shared atomic record store.
 * @param {string} activeSceneId Region already held by the runtime.
 * @returns {Record<string, ReturnType<typeof createThreefoldSimulation>|null>} Validated saved regions.
 */
function loadSavedCampaignRuns(storage, activeSceneId) {
  return Object.fromEntries(
    THREEFOLD_CAMPAIGN_SCENE_IDS.filter(id => id !== activeSceneId).map(id => [
      id,
      createThreefoldSimulationSaveStore(storage, id).load(),
    ])
  );
}

/**
 * Read Broken Gate harbor consequences only for the Belltops presentation.
 * @param {import('./campaign-storage.js').ThreefoldCampaignStorage} storage Shared campaign storage.
 * @param {string|undefined} sceneId Active scene.
 * @returns {ReturnType<typeof getThreefoldHarborCampaignContent>} Visible harbor content.
 */
function loadHarborCampaign(storage, sceneId) {
  if (sceneId !== THREEFOLD_BELLTOPS_SCENE_ID) return null;
  return getThreefoldHarborCampaignContent(
    createThreefoldSimulationSaveStore(storage).load()
  );
}
