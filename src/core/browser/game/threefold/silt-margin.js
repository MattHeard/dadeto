import { createScaleState } from './spatial.js';
import {
  createThreefoldSiltMarginWaterPuzzle,
  getThreefoldSiltMarginWaterStatus,
  normalizeThreefoldSiltMarginWaterPuzzle,
} from './silt-margin-water.js';

export const THREEFOLD_SILT_MARGIN_SCENE_ID = 'silt-margin';
export const THREEFOLD_SILT_MARGIN_GUARDIAN_ID = 'silt-margin-guardian';
export const THREEFOLD_SILT_MARGIN_SIGNAL_ID = 'silt-margin-choir-signal';
export const THREEFOLD_SILT_MARGIN_ROOT_ARCH_ID = 'silt-margin-root-arch';
export const THREEFOLD_SILT_MARGIN_DEW_CROSSING_ID = 'silt-margin-dew-crossing';
export const THREEFOLD_SILT_MARGIN_FINE_VALVE_ID = 'silt-margin-fine-valve';

const SCENE_BOUNDS = { min: { x: 0, y: 0 }, max: { x: 0.32, y: 0.18 } };
const GUARDIAN_BOUNDS = {
  min: { x: 0.115, y: 0.077, z: 0 },
  max: { x: 0.143, y: 0.103, z: 0.06 },
};
const SIGNAL_BOUNDS = {
  min: { x: 0.248, y: 0.076, z: 0 },
  max: { x: 0.26, y: 0.104, z: 0.02 },
};
const ROOT_ARCH_BOUNDS = {
  min: { x: 0.134, y: 0.073, z: 0.03 },
  max: { x: 0.158, y: 0.107, z: 0.06 },
};
const DEW_CROSSING_BOUNDS = {
  min: { x: 0.16, y: 0, z: 0 },
  max: { x: 0.216, y: 0.18, z: 0.045 },
};
/** @typedef {{guardian: 'present'|'guided-aside'|'killed', signal: 'blocked'|'sent'|'disrupted', quietingEvidenceHeard: boolean, waterPuzzle: ReturnType<typeof createThreefoldSiltMarginWaterPuzzle>}} ThreefoldSiltMarginState */
/** @typedef {{min: {x: number, y: number}, max: {x: number, y: number}}} ThreefoldPlanarBounds */
/** @typedef {{min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}} ThreefoldSolidBounds */
/** @typedef {{id: string, bounds: ThreefoldSolidBounds}} ThreefoldSolidObject */
/** @typedef {{id: string, position: {x: number, y: number}, bounds: ThreefoldSolidBounds}} ThreefoldInteractable */
/** @typedef {{id: string, bounds: ThreefoldSolidBounds}} ThreefoldSiltMarginCreature */
/** @typedef {{id: 'silt-margin', bounds: ThreefoldPlanarBounds, spawn: ReturnType<typeof createScaleState>, baseBodyWidthMeters: number, areas: Array<{id: string, bounds: ThreefoldPlanarBounds}>, geometry: ThreefoldSolidObject[], decorations: ThreefoldSolidObject[], interactables: ThreefoldInteractable[], creatures: ThreefoldSiltMarginCreature[]}} ThreefoldSiltMarginScene */

/**
 * Create the authored Silt Margin starting at Mara's smallest scale.
 * @returns {ThreefoldSiltMarginScene} Independent physical scene definition.
 */
export function createThreefoldSiltMarginScene() {
  return {
    id: THREEFOLD_SILT_MARGIN_SCENE_ID,
    bounds: { min: { ...SCENE_BOUNDS.min }, max: { ...SCENE_BOUNDS.max } },
    spawn: createScaleState(
      { x: 0.128, y: 0.09 },
      {
        scale: -4,
        anchor: 8,
        maximumAnchor: 8,
        minimumUnlockedScale: -4,
        maximumUnlockedScale: -3,
      }
    ),
    baseBodyWidthMeters: 0.4,
    areas: [{ id: 'silt-margin', bounds: copyBounds() }],
    geometry: [
      { id: THREEFOLD_SILT_MARGIN_ROOT_ARCH_ID, bounds: copyRootArchBounds() },
      {
        id: THREEFOLD_SILT_MARGIN_DEW_CROSSING_ID,
        bounds: copyDewCrossingBounds(),
      },
    ],
    decorations: [
      {
        id: 'silt-margin-dew-pool',
        bounds: {
          min: { x: 0.19, y: 0.102, z: 0 },
          max: { x: 0.238, y: 0.118, z: 0.004 },
        },
      },
      {
        id: 'silt-margin-signal-root',
        bounds: {
          min: { x: 0.243, y: 0.063, z: 0 },
          max: { x: 0.267, y: 0.117, z: 0.028 },
        },
      },
    ],
    interactables: [
      {
        id: THREEFOLD_SILT_MARGIN_FINE_VALVE_ID,
        position: { x: 0.138, y: 0.09 },
        bounds: {
          min: { x: 0.135, y: 0.087, z: 0 },
          max: { x: 0.141, y: 0.093, z: 0.012 },
        },
      },
      {
        id: THREEFOLD_SILT_MARGIN_GUARDIAN_ID,
        position: { x: 0.128, y: 0.09 },
        bounds: copyGuardianBounds(),
      },
      {
        id: THREEFOLD_SILT_MARGIN_SIGNAL_ID,
        position: { x: 0.254, y: 0.09 },
        bounds: copySignalBounds(),
      },
    ],
    creatures: [
      {
        id: THREEFOLD_SILT_MARGIN_GUARDIAN_ID,
        bounds: copyGuardianBounds(),
      },
    ],
  };
}

/**
 * Return a fresh opening state for the Choir signal crossing.
 * @returns {ThreefoldSiltMarginState} Opening puzzle state.
 */
export function createThreefoldSiltMarginState() {
  return {
    guardian: 'present',
    signal: 'blocked',
    quietingEvidenceHeard: false,
    waterPuzzle: createThreefoldSiltMarginWaterPuzzle(),
  };
}

/**
 * Validate a saved Silt Margin branch without accepting authored text.
 * @param {unknown} candidate Saved scene state.
 * @returns {ThreefoldSiltMarginState} Canonical puzzle state.
 */
export function normalizeThreefoldSiltMarginState(candidate) {
  if (!candidate || typeof candidate !== 'object')
    throw new RangeError('Silt Margin state is invalid.');
  const state = /** @type {Record<string, unknown>} */ (candidate);
  const guardian = state.guardian;
  const signal = state.signal;
  const quietingEvidenceHeard = state.quietingEvidenceHeard ?? false;
  const waterPuzzle = normalizeThreefoldSiltMarginWaterPuzzle(
    state.waterPuzzle ??
      createThreefoldSiltMarginWaterPuzzle({ crossingOpen: signal === 'sent' })
  );
  const consistent =
    (guardian === 'present' && signal === 'blocked') ||
    (guardian === 'guided-aside' &&
      (signal === 'blocked' || signal === 'sent')) ||
    (guardian === 'killed' && signal === 'disrupted');
  if (!consistent) throw new RangeError('Silt Margin state is inconsistent.');
  if (typeof quietingEvidenceHeard !== 'boolean')
    throw new RangeError('Silt Margin evidence state is invalid.');
  if (
    quietingEvidenceHeard &&
    !(guardian === 'guided-aside' && signal === 'sent')
  )
    throw new RangeError(
      'The Choir trace requires a safely crossed signal path.'
    );
  if (
    signal === 'sent' &&
    !getThreefoldSiltMarginWaterStatus(waterPuzzle).crossingAvailable
  )
    throw new RangeError(
      'The Choir signal cannot be sent across a flooded crossing.'
    );
  return /** @type {ThreefoldSiltMarginState} */ ({
    guardian,
    signal,
    quietingEvidenceHeard,
    waterPuzzle,
  });
}

/**
 * Copy the growth-sensitive root arch that spans the dew channel.
 * @returns {ThreefoldSolidBounds} Independent arch bounds.
 */
function copyRootArchBounds() {
  return { min: { ...ROOT_ARCH_BOUNDS.min }, max: { ...ROOT_ARCH_BOUNDS.max } };
}

/**
 * Copy the water crossing's movement barrier.
 * @returns {ThreefoldSolidBounds} Independent crossing bounds.
 */
function copyDewCrossingBounds() {
  return {
    min: { ...DEW_CROSSING_BOUNDS.min },
    max: { ...DEW_CROSSING_BOUNDS.max },
  };
}

/**
 * Copy the authored two-dimensional world extent.
 * @returns {{min: {x: number, y: number}, max: {x: number, y: number}}} Independent bounds.
 */
function copyBounds() {
  return { min: { ...SCENE_BOUNDS.min }, max: { ...SCENE_BOUNDS.max } };
}

/**
 * Copy the guardian's physical body bounds.
 * @returns {typeof GUARDIAN_BOUNDS} Independent bounds.
 */
function copyGuardianBounds() {
  return {
    min: { ...GUARDIAN_BOUNDS.min },
    max: { ...GUARDIAN_BOUNDS.max },
  };
}

/**
 * Copy the Choir signal interface's physical bounds.
 * @returns {typeof SIGNAL_BOUNDS} Independent bounds.
 */
function copySignalBounds() {
  return { min: { ...SIGNAL_BOUNDS.min }, max: { ...SIGNAL_BOUNDS.max } };
}
