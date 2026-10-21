import { parseJsonOrNull } from '../../validation.js';
import { normalizeThreefoldElapsedGameSeconds } from './campaign-clock.js';
import { flowWaterThroughPort } from './water.js';

const GAME_ID = 'threefold-pressure-network';
const FLOOD_DEPTH_METERS = 0.02;
const TOTAL_VOLUME_CUBIC_METERS = 0.005;
const FLAGS = [
  'regulatorFailed',
  'hatchClosed',
  'nurseryDamaged',
  'bypassOpen',
  'nurseryFlooded',
];
const CHAMBERS = [
  { id: 'quay-feeder', floorElevationMeters: 0, areaSquareMeters: 0.1 },
  { id: 'grainlands-nursery', floorElevationMeters: 0, areaSquareMeters: 0.1 },
  {
    id: 'hearthgaps-relief',
    floorElevationMeters: -0.02,
    areaSquareMeters: 0.5,
  },
];

/** @typedef {{volumesCubicMeters: number[], regulatorFailed: boolean, hatchClosed: boolean, nurseryDamaged: boolean, bypassOpen: boolean, nurseryFlooded: boolean}} ThreefoldPressureNetwork */
/** @typedef {{regulatorFailed: boolean, nurseryDamaged: boolean, closeHatch: boolean, coordinatedBypass: boolean}} ThreefoldPressureInputs */

/**
 * Create the regulated five-litre local feeder and two empty receiving basins.
 * These are authored SI dimensions, independent of the camera and player scale.
 * @returns {ThreefoldPressureNetwork} Independent campaign hydraulic state.
 */
export function createThreefoldPressureNetwork() {
  return {
    volumesCubicMeters: [TOTAL_VOLUME_CUBIC_METERS, 0, 0],
    regulatorFailed: false,
    hatchClosed: false,
    nurseryDamaged: false,
    bypassOpen: false,
    nurseryFlooded: false,
  };
}

/**
 * Commit physical controls and advance the same reservoir across all regions.
 * Relief is solved before the nursery inlet in bounded substeps. Both ports
 * use the existing head-gradient solver and conserve the shared water volume.
 * @param {ThreefoldPressureNetwork} state Current campaign network.
 * @param {ThreefoldPressureInputs} inputs Observed irreversible route actions.
 * @param {number} durationSeconds Explicit elapsed game seconds.
 * @returns {ThreefoldPressureNetwork} Updated water and permanent consequences.
 */
export function advanceThreefoldPressureNetwork(
  state,
  inputs,
  durationSeconds
) {
  normalizeThreefoldElapsedGameSeconds(durationSeconds, 'Pressure network');
  let next = {
    ...state,
    volumesCubicMeters: [...state.volumesCubicMeters],
    regulatorFailed: state.regulatorFailed || inputs.regulatorFailed,
    nurseryDamaged: state.nurseryDamaged || inputs.nurseryDamaged,
    hatchClosed: state.hatchClosed || inputs.closeHatch,
    bypassOpen: state.bypassOpen || inputs.coordinatedBypass,
  };
  const steps = Math.min(600, Math.ceil(durationSeconds));
  for (let index = 0; index < steps; index += 1)
    next = advancePressurePorts(next, durationSeconds / steps);
  return next;
}

/**
 * Reconstruct fixed physical dimensions from the saved water volumes.
 * @param {ThreefoldPressureNetwork} state Campaign hydraulic state.
 * @returns {Array<{id: string, floorElevationMeters: number, areaSquareMeters: number, volumeCubicMeters: number}>} Canonical chambers.
 */
function pressureChambers(state) {
  return CHAMBERS.map((chamber, index) => ({
    ...chamber,
    volumeCubicMeters: state.volumesCubicMeters[index],
  }));
}

/**
 * Solve the relief outlet then the shelter inlet for one bounded time step.
 * A broken nursery cannot seal its hatch; established flooding stays recorded.
 * @param {ThreefoldPressureNetwork} state Current water and controls.
 * @param {number} durationSeconds Substep in explicit game seconds.
 * @returns {ThreefoldPressureNetwork} Conserved volumes and latched flooding.
 */
function advancePressurePorts(state, durationSeconds) {
  const [feeder, nursery, relief] = pressureChambers(state);
  const reliefFlow = flowWaterThroughPort(
    feeder,
    relief,
    createPressurePort(state.bypassOpen, 0.00004),
    durationSeconds
  );
  const nurseryFlow = flowWaterThroughPort(
    reliefFlow.chambers[0],
    nursery,
    createPressurePort(
      state.regulatorFailed && (!state.hatchClosed || state.nurseryDamaged),
      0.00001
    ),
    durationSeconds
  );
  const next = {
    ...state,
    volumesCubicMeters: [
      nurseryFlow.chambers[0].volumeCubicMeters,
      nurseryFlow.chambers[1].volumeCubicMeters,
      reliefFlow.chambers[1].volumeCubicMeters,
    ],
  };
  next.nurseryFlooded =
    state.nurseryFlooded ||
    getThreefoldNurseryWaterDepthMeters(next) >= FLOOD_DEPTH_METERS;
  return next;
}

/**
 * Define the zero-elevation sill shared by both authored network outlets.
 * @param {boolean} open Whether the physical control allows flow.
 * @param {number} areaSquareMeters Authored port opening area.
 * @returns {{open: boolean, areaSquareMeters: number, sillElevationMeters: number}} Physical port.
 */
function createPressurePort(open, areaSquareMeters) {
  return { open, areaSquareMeters, sillElevationMeters: 0 };
}

/**
 * Return the physical depth at the Nursery Clades shelter.
 * @param {ThreefoldPressureNetwork} state Campaign network.
 * @returns {number} Water depth in metres.
 */
export function getThreefoldNurseryWaterDepthMeters(state) {
  return state.volumesCubicMeters[1] / CHAMBERS[1].areaSquareMeters;
}

/**
 * Describe current water without erasing damage after drainage.
 * @param {ThreefoldPressureNetwork} state Campaign network.
 * @returns {string} Accessible shelter and network status.
 */
export function describeThreefoldPressureNetwork(state) {
  const depthMillimeters = Math.round(
    getThreefoldNurseryWaterDepthMeters(state) * 1000
  );
  const shelter = state.nurseryFlooded ? 'flood damage remains' : 'not flooded';
  const hatch = state.nurseryDamaged
    ? 'broken'
    : state.hatchClosed
      ? 'closed'
      : 'open';
  const bypass = state.bypassOpen
    ? 'relief bypass operating'
    : 'relief needs Hearthgaps bypass and Choir signal';
  return `Grainlands shelter: ${depthMillimeters} mm water; ${shelter}; hatch ${hatch}; ${bypass}.`;
}

/**
 * Serialize campaign water separately from route save envelopes.
 * @param {ThreefoldPressureNetwork} state Campaign hydraulic state.
 * @returns {string} Versioned save containing volumes and irreversible controls.
 */
export function serializeThreefoldPressureNetwork(state) {
  return JSON.stringify({
    game: GAME_ID,
    schemaVersion: 1,
    state: normalizeThreefoldPressureNetwork(state),
  });
}

/**
 * Restore only valid conserved campaign water, without accepting authored dimensions.
 * @param {unknown} serialized Candidate stored envelope.
 * @returns {ThreefoldPressureNetwork|null} Canonical network or null.
 */
export function restoreThreefoldPressureNetwork(serialized) {
  if (typeof serialized !== 'string') return null;
  const parsed = parseJsonOrNull(serialized);
  if (!parsed || typeof parsed !== 'object') return null;
  const envelope = /** @type {Record<string, unknown>} */ (parsed);
  if (envelope.game !== GAME_ID || envelope.schemaVersion !== 1) return null;
  try {
    return normalizeThreefoldPressureNetwork(envelope.state);
  } catch {
    return null;
  }
}

/**
 * Check conserved physical volumes and the complete campaign flag record.
 * @param {unknown} candidate Stored network state.
 * @returns {ThreefoldPressureNetwork} Canonical campaign state.
 */
function normalizeThreefoldPressureNetwork(candidate) {
  if (!candidate || typeof candidate !== 'object')
    throw new TypeError('Pressure network state is invalid.');
  const record = /** @type {Record<string, unknown>} */ (candidate);
  const volumes = record.volumesCubicMeters;
  if (
    !Array.isArray(volumes) ||
    volumes.length !== CHAMBERS.length ||
    volumes.some(
      value => typeof value !== 'number' || !Number.isFinite(value) || value < 0
    ) ||
    Math.abs(
      volumes.reduce((sum, value) => sum + value, 0) - TOTAL_VOLUME_CUBIC_METERS
    ) > 1e-10
  )
    throw new RangeError('Pressure network water is not conserved.');
  const flags = Object.fromEntries(
    FLAGS.map(key => {
      if (typeof record[key] !== 'boolean')
        throw new TypeError('Pressure network controls are invalid.');
      return [key, record[key]];
    })
  );
  const state = /** @type {ThreefoldPressureNetwork} */ ({
    ...flags,
    volumesCubicMeters: [...volumes],
  });
  state.nurseryFlooded =
    state.nurseryFlooded ||
    getThreefoldNurseryWaterDepthMeters(state) >= FLOOD_DEPTH_METERS;
  return state;
}
