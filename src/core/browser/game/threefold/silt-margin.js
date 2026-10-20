import { createScaleState } from './spatial.js';

export const THREEFOLD_SILT_MARGIN_SCENE_ID = 'silt-margin';
export const THREEFOLD_SILT_MARGIN_GUARDIAN_ID = 'silt-margin-guardian';
export const THREEFOLD_SILT_MARGIN_SIGNAL_ID = 'silt-margin-choir-signal';

const SCENE_BOUNDS = { min: { x: 0, y: 0 }, max: { x: 0.32, y: 0.18 } };
const GUARDIAN_BOUNDS = {
  min: { x: 0.115, y: 0.077, z: 0 },
  max: { x: 0.143, y: 0.103, z: 0.06 },
};
const SIGNAL_BOUNDS = {
  min: { x: 0.248, y: 0.076, z: 0 },
  max: { x: 0.26, y: 0.104, z: 0.02 },
};
/** @typedef {{guardian: 'present'|'guided-aside'|'killed', signal: 'blocked'|'sent'|'disrupted'}} ThreefoldSiltMarginState */
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
    geometry: [],
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
  return { guardian: 'present', signal: 'blocked' };
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
  const consistent =
    (guardian === 'present' && signal === 'blocked') ||
    (guardian === 'guided-aside' &&
      (signal === 'blocked' || signal === 'sent')) ||
    (guardian === 'killed' && signal === 'disrupted');
  if (!consistent) throw new RangeError('Silt Margin state is inconsistent.');
  return /** @type {ThreefoldSiltMarginState} */ ({
    guardian,
    signal,
  });
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
