import { THREEFOLD_CAMPAIGN_SCENE_IDS } from './campaign.js';
import { flowWaterThroughPort } from './water.js';
import { normalizeThreefoldElapsedGameSeconds } from './campaign-clock.js';

export const THREEFOLD_RETURN_TIDE_RISE_SECONDS = 1800;
export const THREEFOLD_RETURN_TIDE_PEAK_SECONDS = 3600;
export const THREEFOLD_RETURN_TIDE_END_SECONDS = 5400;
export const THREEFOLD_RETURN_TIDE_VOLUME = 20000;
const STEP_SECONDS = 15;
const FACTIONS = [
  'assembly',
  'latchfolk',
  'threadbound',
  'nursery',
  'choir',
  'crownback',
];
const MECHANISM_IDS = [
  'seal',
  'spillway',
  'human-manifold',
  'root-manifold',
  'coast-manifold',
];
const CONTROLS = [
  'sealClosed',
  'spillwayOpen',
  'humanManifold',
  'rootManifold',
  'coastManifold',
  'foldglassBound',
];
const LOSS_IDS = [
  'quay-low-district',
  'quay-hospital',
  'quay-pumps',
  'choir-branches',
  'root-crossings',
  'hearthgaps-homes',
  'nursery-chambers',
  'living-breakwater',
];
const ACTOR_IDS = [
  'sera',
  'orla',
  'mira',
  'tov',
  'brin',
  'pell',
  'iru',
  'neme',
  'tharn',
];
const CHAMBERS = [
  { id: 'return-tide-head', floorElevationMeters: 0, areaSquareMeters: 2000 },
  { id: 'quay-floodplain', floorElevationMeters: 0, areaSquareMeters: 5000 },
  { id: 'deep-root-network', floorElevationMeters: 0, areaSquareMeters: 20000 },
  {
    id: 'hearthgaps-sacrifice-channel',
    floorElevationMeters: 0,
    areaSquareMeters: 500,
  },
  { id: 'offshore-outlet', floorElevationMeters: -4, areaSquareMeters: 100000 },
];

/** @typedef {'assembly'|'latchfolk'|'threadbound'|'nursery'|'choir'|'crownback'} ReturnTideFaction */
/** @typedef {{sealClosed:boolean,spillwayOpen:boolean,humanManifold:boolean,rootManifold:boolean,coastManifold:boolean,foldglassBound:boolean}} ReturnTideControls */
/** @typedef {{originGameSeconds:number,elapsedGameSeconds:number,controls:ReturnTideControls,agreements:string[],volumesCubicMeters:number[],peakDepthsMeters:number[],damageIds:string[],deathIds:string[],displacedGroups:string[],observedSceneIds:string[],brokenMechanisms:string[],rememberedGrowthDeaths:string[],regulatorFailed:boolean}} ThreefoldReturnTide */
/** @typedef {{intactMechanisms:string[],availableFactions:string[],engineerAvailable:boolean,evidenceCount:number,rootRelief:boolean,coastReady:boolean,preparedGroups:string[],priorDeathIds:string[]}} ReturnTideFacts */
/** @typedef {'close-seal'|'open-seal'|'open-spillway'|'fit-human-manifold'|'fit-root-manifold'|'fit-coast-manifold'|'bind-foldglass'} ReturnTideOperation */

/**
 * Begin an unavoidable action-time tide, preserving a warning horizon for legacy campaigns.
 * @param {number} [originGameSeconds] Campaign time when this tide model first exists.
 * @returns {ThreefoldReturnTide} Fresh physical state without a chosen ending.
 */
export function createThreefoldReturnTide(originGameSeconds = 0) {
  normalizeThreefoldElapsedGameSeconds(originGameSeconds, 'Return Tide origin');
  return {
    originGameSeconds,
    elapsedGameSeconds: 0,
    controls: {
      sealClosed: false,
      spillwayOpen: false,
      humanManifold: false,
      rootManifold: false,
      coastManifold: false,
      foldglassBound: false,
    },
    agreements: [],
    volumesCubicMeters: [THREEFOLD_RETURN_TIDE_VOLUME, 0, 0, 0, 0],
    peakDepthsMeters: [10, 0, 0, 0, 0],
    damageIds: [],
    deathIds: [],
    displacedGroups: [],
    observedSceneIds: [],
    brokenMechanisms: [],
    rememberedGrowthDeaths: [],
    regulatorFailed: false,
  };
}

/**
 * Validate the complete physical record before a restore can affect live play.
 * @param {unknown} candidate Candidate stored tide state.
 * @returns {ThreefoldReturnTide} Independent canonical copy.
 */
export function normalizeThreefoldReturnTide(candidate) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate))
    throw new TypeError('Return Tide state is invalid.');
  const state = /** @type {Record<string, any>} */ (candidate);
  const origin = normalizeThreefoldElapsedGameSeconds(
    state.originGameSeconds,
    'Return Tide origin'
  );
  const elapsed = normalizeThreefoldElapsedGameSeconds(
    state.elapsedGameSeconds,
    'Return Tide elapsed'
  );
  if (
    elapsed > THREEFOLD_RETURN_TIDE_END_SECONDS ||
    elapsed % STEP_SECONDS !== 0
  )
    throw new RangeError('Return Tide step is invalid.');
  if (
    !state.controls ||
    CONTROLS.some(key => typeof state.controls[key] !== 'boolean')
  )
    throw new TypeError('Return Tide controls are invalid.');
  if (typeof state.regulatorFailed !== 'boolean')
    throw new TypeError('Return Tide failure is invalid.');
  const volumes = normalizeMeasurements(state.volumesCubicMeters);
  if (
    Math.abs(
      volumes.reduce((sum, volume) => sum + volume, 0) -
        THREEFOLD_RETURN_TIDE_VOLUME
    ) > 0.000001
  )
    throw new RangeError('Return Tide water is not conserved.');
  const peaks = normalizeMeasurements(state.peakDepthsMeters);
  if (
    volumes.some(
      (volume, index) =>
        peaks[index] + 0.000001 < volume / CHAMBERS[index].areaSquareMeters
    )
  )
    throw new RangeError('Return Tide peak cannot be below current water.');
  return {
    originGameSeconds: origin,
    elapsedGameSeconds: elapsed,
    controls: /** @type {ReturnTideControls} */ (
      Object.fromEntries(CONTROLS.map(key => [key, state.controls[key]]))
    ),
    agreements: normalizeIdentifiers(state.agreements, FACTIONS),
    volumesCubicMeters: volumes,
    peakDepthsMeters: peaks,
    damageIds: normalizeIdentifiers(state.damageIds, LOSS_IDS),
    deathIds: normalizeIdentifiers(state.deathIds, ACTOR_IDS),
    displacedGroups: normalizeIdentifiers(state.displacedGroups, FACTIONS),
    brokenMechanisms: normalizeIdentifiers(
      state.brokenMechanisms,
      MECHANISM_IDS
    ),
    rememberedGrowthDeaths: normalizeIdentifiers(
      state.rememberedGrowthDeaths,
      ACTOR_IDS
    ),
    observedSceneIds: normalizeIdentifiers(state.observedSceneIds, [
      ...THREEFOLD_CAMPAIGN_SCENE_IDS,
    ]),
    regulatorFailed: state.regulatorFailed,
  };
}

/**
 * Register an explicit witnessed maintenance agreement, never a hidden trust score.
 * @param {ThreefoldReturnTide} state Canonical current tide state.
 * @param {ReturnTideFaction} faction Local faction actually approached.
 * @param {ReturnTideFacts} facts Physical/evidence prerequisites already established.
 * @returns {ThreefoldReturnTide} Signed agreement or unchanged state when unavailable.
 */
export function pledgeThreefoldReturnTide(state, faction, facts) {
  if (
    !FACTIONS.includes(faction) ||
    !facts.availableFactions.includes(faction) ||
    facts.evidenceCount < 1
  )
    return state;
  if (state.agreements.includes(faction)) return state;
  return { ...state, agreements: [...state.agreements, faction].sort() };
}

/**
 * Operate a physical component; independent components may combine or conflict.
 * @param {ThreefoldReturnTide} state Current tide state.
 * @param {ReturnTideOperation} operation Explicit device action.
 * @param {ReturnTideFacts} facts Surviving mechanisms and earned prerequisites.
 * @returns {ThreefoldReturnTide} Device/cost change, or the same state if unavailable.
 */
export function operateThreefoldReturnTide(state, operation, facts) {
  const control = operationControl(operation);
  if (!control || !canOperate(state, operation, facts)) return state;
  const value = operation !== 'open-seal';
  if (state.controls[control] === value) return state;
  const next = { ...state, controls: { ...state.controls, [control]: value } };
  if (operation === 'close-seal')
    return {
      ...next,
      damageIds: addIdentifiers(next.damageIds, ['choir-branches']),
    };
  return next;
}

/**
 * Advance fixed hydraulic steps against absolute game time; redraw cannot add time.
 * Losses, displacement and deaths latch at their actual physical exposure.
 * @param {ThreefoldReturnTide} state Current conserved world state.
 * @param {ReturnTideFacts} facts Prior committed regional state and preparation.
 * @param {number} absoluteGameSeconds Explicit campaign action clock.
 * @returns {ThreefoldReturnTide} Updated physical aftermath, independent of render scale.
 */
export function advanceThreefoldReturnTide(state, facts, absoluteGameSeconds) {
  normalizeThreefoldElapsedGameSeconds(
    absoluteGameSeconds,
    'Return Tide clock'
  );
  const target = Math.min(
    THREEFOLD_RETURN_TIDE_END_SECONDS,
    absoluteGameSeconds - state.originGameSeconds
  );
  if (target < state.elapsedGameSeconds)
    throw new RangeError('Return Tide cannot be backdated.');
  let next = state;
  while (next.elapsedGameSeconds + STEP_SECONDS <= target) {
    next = {
      ...next,
      elapsedGameSeconds: next.elapsedGameSeconds + STEP_SECONDS,
    };
    if (next.elapsedGameSeconds >= THREEFOLD_RETURN_TIDE_RISE_SECONDS)
      next = advanceTideStep(next, facts);
  }
  return next;
}

/**
 * Describe the real phase without an ending selector.
 * @param {ThreefoldReturnTide} state Canonical tide timeline.
 * @returns {'warning'|'rising'|'receding'|'aftermath'} Current world phase.
 */
export function getThreefoldReturnTidePhase(state) {
  if (state.elapsedGameSeconds >= THREEFOLD_RETURN_TIDE_END_SECONDS)
    return 'aftermath';
  if (state.elapsedGameSeconds >= THREEFOLD_RETURN_TIDE_PEAK_SECONDS)
    return 'receding';
  if (state.elapsedGameSeconds >= THREEFOLD_RETURN_TIDE_RISE_SECONDS)
    return 'rising';
  return 'warning';
}

/**
 * Report explicit long-term labor and Foldglass costs of surviving agreements.
 * @param {ThreefoldReturnTide} state Committed controls and agreements.
 * @returns {string[]} Concrete obligations without an alignment grade.
 */
export function getThreefoldReturnTideObligations(state) {
  const obligations = state.agreements.map(
    faction =>
      `${faction}: maintain a staffed tide-control shift; replace damaged shelter and tools.`
  );
  if (state.controls.foldglassBound)
    obligations.push(
      'Mara: Foldglass is bound to the regulator; after leaving scale +4, that band cannot be entered again.'
    );
  return obligations;
}

/**
 * @param {ReturnTideOperation} operation Device command.
 * @returns {keyof ReturnTideControls|null} Target control.
 */
function operationControl(operation) {
  const controls = {
    'close-seal': 'sealClosed',
    'open-seal': 'sealClosed',
    'open-spillway': 'spillwayOpen',
    'fit-human-manifold': 'humanManifold',
    'fit-root-manifold': 'rootManifold',
    'fit-coast-manifold': 'coastManifold',
    'bind-foldglass': 'foldglassBound',
  };
  return /** @type {keyof ReturnTideControls|null} */ (
    controls[operation] || null
  );
}

/**
 * Require actual hardware and consent/evidence before component installation.
 * @param {ThreefoldReturnTide} state Existing installed pieces and signatures.
 * @param {ReturnTideOperation} operation Physical command.
 * @param {ReturnTideFacts} facts Available support.
 * @returns {boolean} Whether this specific operation can be performed.
 */
function canOperate(state, operation, facts) {
  if (operation === 'close-seal' || operation === 'open-seal')
    return (
      facts.intactMechanisms.includes('seal') &&
      !state.brokenMechanisms.includes('seal')
    );
  if (operation === 'open-spillway')
    return (
      facts.intactMechanisms.includes('spillway') &&
      !state.brokenMechanisms.includes('spillway') &&
      facts.coastReady
    );
  if (operation === 'fit-human-manifold')
    return (
      facts.intactMechanisms.includes('human-manifold') &&
      facts.engineerAvailable &&
      state.agreements.includes('assembly')
    );
  if (operation === 'fit-root-manifold')
    return (
      facts.intactMechanisms.includes('root-manifold') &&
      facts.rootRelief &&
      state.agreements.includes('choir')
    );
  if (operation === 'fit-coast-manifold')
    return (
      facts.intactMechanisms.includes('coast-manifold') &&
      facts.coastReady &&
      state.agreements.includes('crownback')
    );
  return operation === 'bind-foldglass' && sharedRegulatorReady(state, facts);
}

/**
 * Require explicit cross-scale consent, working components and known evidence.
 * @param {ThreefoldReturnTide} state Installed pieces and actual promises.
 * @param {ReturnTideFacts} facts Surviving regional support.
 * @returns {boolean} Whether Foldglass can make the distributed regulator work.
 */
function sharedRegulatorReady(state, facts) {
  if (
    state.damageIds.includes('quay-pumps') ||
    state.damageIds.includes('choir-branches') ||
    state.damageIds.includes('living-breakwater')
  )
    return false;
  return (
    ['humanManifold', 'rootManifold', 'coastManifold'].every(
      key => state.controls[/** @type {keyof ReturnTideControls} */ (key)]
    ) &&
    ['assembly', 'latchfolk', 'choir', 'crownback'].every(faction =>
      state.agreements.includes(faction)
    ) &&
    ['human-manifold', 'root-manifold', 'coast-manifold'].every(
      id =>
        facts.intactMechanisms.includes(id) &&
        !state.brokenMechanisms.includes(id)
    ) &&
    facts.engineerAvailable &&
    facts.rootRelief &&
    facts.coastReady &&
    facts.evidenceCount >= 2
  );
}

/**
 * Solve the same finite coastal reservoir through independent physical openings.
 * @param {ThreefoldReturnTide} state Pre-step state.
 * @param {ReturnTideFacts} facts Available mechanisms at this world step.
 * @returns {ThreefoldReturnTide} Conserved flow and latched exposure consequences.
 */
function advanceTideStep(state, facts) {
  const ready =
    state.controls.foldglassBound && sharedRegulatorReady(state, facts);
  const partial =
    state.controls.humanManifold ||
    state.controls.rootManifold ||
    state.controls.coastManifold;
  const seal =
    state.controls.sealClosed &&
    facts.intactMechanisms.includes('seal') &&
    !state.brokenMechanisms.includes('seal');
  const spillway =
    state.controls.spillwayOpen &&
    facts.intactMechanisms.includes('spillway') &&
    !state.brokenMechanisms.includes('spillway');
  const areas = tidePortAreas(ready, partial, seal, spillway);
  if (state.elapsedGameSeconds >= THREEFOLD_RETURN_TIDE_PEAK_SECONDS)
    areas[3] += 12;
  const chambers = CHAMBERS.map((chamber, index) => ({
    ...chamber,
    volumeCubicMeters: state.volumesCubicMeters[index],
  }));
  for (let receiver = 1; receiver < chambers.length; receiver += 1) {
    const flow = flowWaterThroughPort(
      chambers[0],
      chambers[receiver],
      {
        open: areas[receiver - 1] > 0,
        areaSquareMeters: Math.max(Number.MIN_VALUE, areas[receiver - 1]),
        sillElevationMeters: 0,
      },
      STEP_SECONDS
    );
    chambers[0] = flow.chambers[0];
    chambers[receiver] = flow.chambers[1];
  }
  const volumes = chambers.map(chamber => chamber.volumeCubicMeters);
  const peaks = state.peakDepthsMeters.map((peak, index) =>
    Math.max(peak, volumes[index] / CHAMBERS[index].areaSquareMeters)
  );
  const failed =
    state.regulatorFailed ||
    (partial &&
      !ready &&
      state.elapsedGameSeconds >= THREEFOLD_RETURN_TIDE_PEAK_SECONDS);
  return applyTideExposure(
    {
      ...state,
      volumesCubicMeters: volumes,
      peakDepthsMeters: peaks,
      regulatorFailed: failed,
    },
    facts
  );
}

/**
 * Combine openings so a breached spillway can bypass an otherwise closed seal.
 * @param {boolean} ready Working distributed regulator.
 * @param {boolean} partial Incomplete installed components.
 * @param {boolean} seal Effective city seal.
 * @param {boolean} spillway Effective coastal spillway.
 * @returns {number[]} Port areas to city, roots, sacrifice channel and offshore outlet.
 */
function tidePortAreas(ready, partial, seal, spillway) {
  const base = ready
    ? [1.2, 0.015, 2, 6]
    : partial
      ? [3, 3, 2, 2]
      : [3, 4, 0, 0];
  if (seal) {
    base[0] = 0;
    base[1] = 0;
    base[3] += 12;
  }
  if (spillway) {
    base[0] += 20;
    base[1] = 0;
  }
  return base;
}

/**
 * Preserve concrete losses and casualties independently of eventual drainage.
 * @param {ThreefoldReturnTide} state Actual peak exposure.
 * @param {ReturnTideFacts} facts Preparation and earlier permanent deaths.
 * @returns {ThreefoldReturnTide} Latched damage, displacement and new tide fatalities.
 */
function applyTideExposure(state, facts) {
  const [, city, roots, culvert] = state.peakDepthsMeters;
  const damage = [];
  const displaced = [];
  const deaths = [];
  if (city >= 0.1) {
    damage.push('quay-low-district');
    displaced.push('assembly');
  }
  if (city >= 0.75) damage.push('quay-hospital', 'quay-pumps');
  if (roots >= 0.025) {
    damage.push('root-crossings', 'nursery-chambers');
    displaced.push('threadbound', 'nursery', 'choir');
  }
  if (culvert >= 0.15) {
    damage.push('hearthgaps-homes');
    displaced.push('latchfolk');
  }
  if (state.damageIds.includes('choir-branches')) {
    damage.push('living-breakwater');
    displaced.push('choir', 'crownback', 'latchfolk', 'threadbound', 'nursery');
  }
  if (city >= 0.75 && !facts.preparedGroups.includes('assembly'))
    deaths.push('sera', 'orla', 'mira', 'tov');
  if (roots >= 0.05 && !facts.preparedGroups.includes('nursery'))
    deaths.push('iru');
  if (roots >= 0.025 && !facts.preparedGroups.includes('threadbound'))
    deaths.push('pell');
  if (
    (roots >= 0.01 || state.damageIds.includes('choir-branches')) &&
    !facts.preparedGroups.includes('choir')
  )
    deaths.push('neme');
  if (culvert >= 0.3 && !facts.preparedGroups.includes('latchfolk'))
    deaths.push('brin');
  return {
    ...state,
    damageIds: addIdentifiers(state.damageIds, damage),
    displacedGroups: addIdentifiers(state.displacedGroups, displaced),
    deathIds: addIdentifiers(
      state.deathIds,
      deaths.filter(id => !facts.priorDeathIds.includes(id))
    ),
  };
}

/**
 * @param {unknown} values Candidate measurements.
 * @returns {number[]} Five finite nonnegative measurements.
 */
function normalizeMeasurements(values) {
  if (
    !Array.isArray(values) ||
    values.length !== CHAMBERS.length ||
    values.some(
      value => typeof value !== 'number' || !Number.isFinite(value) || value < 0
    )
  )
    throw new RangeError('Return Tide measurements are invalid.');
  return [...values];
}

/**
 * @param {unknown} values Stored identifier set.
 * @param {string[]} allowed Canonical values.
 * @returns {string[]} Independent sorted unique set.
 */
function normalizeIdentifiers(values, allowed) {
  if (
    !Array.isArray(values) ||
    values.some(
      value => typeof value !== 'string' || !allowed.includes(value)
    ) ||
    new Set(values).size !== values.length
  )
    throw new TypeError('Return Tide identifiers are invalid.');
  return [...values].sort();
}

/**
 * @param {string[]} existing Permanent recorded effects.
 * @param {string[]} additions New effects.
 * @returns {string[]} Canonical union without erasing past outcomes.
 */
function addIdentifiers(existing, additions) {
  return [...new Set([...existing, ...additions])].sort();
}

/**
 * Record an explicit local aftermath survey without disclosing other regions.
 * @param {ThreefoldReturnTide} state Physical world record.
 * @param {string} sceneId Place actually surveyed.
 * @returns {ThreefoldReturnTide} Updated player knowledge.
 */
export function observeThreefoldReturnTide(state, sceneId) {
  if (
    getThreefoldReturnTidePhase(state) !== 'aftermath' ||
    !THREEFOLD_CAMPAIGN_SCENE_IDS.includes(sceneId) ||
    state.observedSceneIds.includes(sceneId)
  )
    return state;
  return {
    ...state,
    observedSceneIds: [...state.observedSceneIds, sceneId].sort(),
  };
}

/**
 * Remember observed structural destruction and earlier named growth deaths across local resets.
 * @param {ThreefoldReturnTide} state Actual campaign history.
 * @param {ReturnTideFacts} facts Current canonical regional facts.
 * @returns {ThreefoldReturnTide} Permanent causal memory, with no new inferred deaths.
 */
export function retainThreefoldReturnTideHistory(state, facts) {
  return {
    ...state,
    brokenMechanisms: addIdentifiers(
      state.brokenMechanisms,
      MECHANISM_IDS.filter(id => !facts.intactMechanisms.includes(id))
    ),
    rememberedGrowthDeaths: addIdentifiers(
      state.rememberedGrowthDeaths,
      facts.priorDeathIds
    ),
  };
}
