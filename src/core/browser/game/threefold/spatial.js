export const MIN_SCALE = -4;
export const MAX_SCALE = 4;
export const BASE_HEIGHT_METERS = 1.8288;
export const INITIAL_MAX_ANCHOR = 8;

/**
 * Create deterministic scale state with a bounded Anchor reserve.
 * @param {{x: number, y: number}} position Canonical position in metres.
 * @param {{scale?: number, anchor?: number, maximumAnchor?: number, minimumUnlockedScale?: number, maximumUnlockedScale?: number, destroyedGeometryIds?: string[]}} options Initial tuning, unlocks and persistent world changes.
 * @returns {{scale: number, position: {x: number, y: number}, anchor: number, maximumAnchor: number, minimumUnlockedScale: number, maximumUnlockedScale: number, recoveryProgressMinutes: number, destroyedGeometryIds: string[]}} New scale state.
 */
export function createScaleState(position, options = {}) {
  assertPosition(position);
  const state = {
    scale: options.scale ?? 0,
    position: { ...position },
    anchor: options.anchor ?? INITIAL_MAX_ANCHOR,
    maximumAnchor: options.maximumAnchor ?? INITIAL_MAX_ANCHOR,
    minimumUnlockedScale: options.minimumUnlockedScale ?? MIN_SCALE,
    maximumUnlockedScale: options.maximumUnlockedScale ?? MAX_SCALE,
    recoveryProgressMinutes: 0,
    destroyedGeometryIds: normalizeGeometryIds(
      options.destroyedGeometryIds ?? []
    ),
  };
  assertScaleState(state);
  return state;
}

/**
 * Return Mara's physical height at one of the nine supported scales.
 * @param {number} scale Discrete scale from -4 through +4.
 * @returns {number} Height in metres.
 */
export function heightAtScale(scale) {
  assertScale(scale);
  return BASE_HEIGHT_METERS * 3 ** scale;
}

/**
 * Change scale while retaining the canonical physical position.
 * @param {ReturnType<typeof createScaleState>} state Current state.
 * @param {number} direction One adjacent scale step, -1 or +1.
 * @param {string[]} intersectingGeometryIds Geometry IDs found inside the expanded body volume.
 * @returns {ReturnType<typeof createScaleState>} Updated state.
 */
export function changeScale(state, direction, intersectingGeometryIds = []) {
  assertScaleState(state);
  if (direction !== -1 && direction !== 1) return state;
  const scale = state.scale + direction;
  if (
    scale < state.minimumUnlockedScale ||
    scale > state.maximumUnlockedScale ||
    state.anchor < 1
  )
    return state;
  const destroyedGeometryIds =
    direction > 0
      ? normalizeGeometryIds([
          ...state.destroyedGeometryIds,
          ...intersectingGeometryIds,
        ])
      : state.destroyedGeometryIds;
  return {
    ...state,
    position: { ...state.position },
    scale,
    anchor: state.anchor - 1,
    destroyedGeometryIds,
  };
}

/**
 * Recover Anchor from deterministic in-game minutes, retaining partial progress.
 * The caller advances this only during simulation time, never while menus pause.
 * @param {ReturnType<typeof createScaleState>} state Current state.
 * @param {number} elapsedGameMinutes Elapsed simulation minutes.
 * @param {number} minutesPerAnchor Recovery interval in simulation minutes.
 * @param {{inCombat: boolean}} context Recovery context from the simulation.
 * @returns {ReturnType<typeof createScaleState>} Updated state.
 */
export function recoverAnchor(
  state,
  elapsedGameMinutes,
  minutesPerAnchor,
  { inCombat }
) {
  assertScaleState(state);
  if (!Number.isFinite(elapsedGameMinutes) || elapsedGameMinutes < 0)
    throw new RangeError(
      'Elapsed game minutes must be finite and non-negative.'
    );
  if (!Number.isFinite(minutesPerAnchor) || minutesPerAnchor <= 0)
    throw new RangeError(
      'Anchor recovery interval must be a positive duration.'
    );
  if (typeof inCombat !== 'boolean')
    throw new TypeError('Anchor recovery requires an explicit combat state.');
  if (
    inCombat ||
    state.anchor >= state.maximumAnchor ||
    elapsedGameMinutes === 0
  )
    return state;
  const progress = state.recoveryProgressMinutes + elapsedGameMinutes;
  const gained = Math.floor(progress / minutesPerAnchor);
  if (gained === 0) return { ...state, recoveryProgressMinutes: progress };
  const anchor = Math.min(state.maximumAnchor, state.anchor + gained);
  return {
    ...state,
    anchor,
    recoveryProgressMinutes:
      anchor === state.maximumAnchor ? 0 : progress % minutesPerAnchor,
  };
}

/**
 * Describe the scale-local 3×3 region containing a canonical world position.
 * Each cell is one Mara-height square at the requested scale. A finer level
 * subdivides each parent cell into a 3×3 child grid.
 * @param {{x: number, y: number}} position Canonical position in metres.
 * @param {number} scale Discrete scale from -4 through +4.
 * @returns {{scale: number, heightMeters: number, cellSizeMeters: number, cell: {x: number, y: number}, local: {x: number, y: number}, region: {x: number, y: number, width: 3, height: 3}}} Scale view.
 */
export function viewAtScale(position, scale) {
  assertPosition(position);
  const cellSizeMeters = heightAtScale(scale);
  const cell = {
    x: Math.floor(position.x / cellSizeMeters),
    y: Math.floor(position.y / cellSizeMeters),
  };
  return {
    scale,
    heightMeters: cellSizeMeters,
    cellSizeMeters,
    cell,
    local: {
      x: position.x - cell.x * cellSizeMeters,
      y: position.y - cell.y * cellSizeMeters,
    },
    region: {
      x: Math.floor(cell.x / 3) * 3,
      y: Math.floor(cell.y / 3) * 3,
      width: 3,
      height: 3,
    },
  };
}

/**
 * Require a supported integer scale.
 * @param {number} scale Candidate scale.
 * @returns {void}
 */
function assertScale(scale) {
  if (!Number.isInteger(scale) || scale < MIN_SCALE || scale > MAX_SCALE)
    throw new RangeError(
      `Scale must be an integer from ${MIN_SCALE} to ${MAX_SCALE}.`
    );
}

/**
 * Require finite canonical coordinates.
 * @param {{x: number, y: number}} position Candidate position.
 * @returns {void}
 */
function assertPosition(position) {
  if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y))
    throw new TypeError(
      'Canonical position must contain finite x and y metres.'
    );
}

/**
 * Validate and canonicalize persistent geometry identifiers.
 * @param {string[]} geometryIds Candidate identifiers.
 * @returns {string[]} Sorted unique identifiers.
 */
function normalizeGeometryIds(geometryIds) {
  if (!Array.isArray(geometryIds))
    throw new TypeError('Destroyed geometry identifiers must be an array.');
  if (geometryIds.some(id => typeof id !== 'string' || id.length === 0))
    throw new TypeError(
      'Destroyed geometry identifiers must be non-empty strings.'
    );
  return [...new Set(geometryIds)].sort();
}

/**
 * Validate resource and progression fields before changing deterministic state.
 * @param {ReturnType<typeof createScaleState>} state Candidate state.
 * @returns {void}
 */
function assertScaleState(state) {
  assertScale(state.scale);
  assertPosition(state.position);
  assertScale(state.minimumUnlockedScale);
  assertScale(state.maximumUnlockedScale);
  if (
    state.minimumUnlockedScale > state.maximumUnlockedScale ||
    state.scale < state.minimumUnlockedScale ||
    state.scale > state.maximumUnlockedScale
  )
    throw new RangeError(
      'Current scale must be inside the unlocked scale range.'
    );
  if (
    !Number.isInteger(state.maximumAnchor) ||
    state.maximumAnchor < 1 ||
    state.maximumAnchor > INITIAL_MAX_ANCHOR ||
    !Number.isInteger(state.anchor) ||
    state.anchor < 0 ||
    state.anchor > state.maximumAnchor ||
    !Number.isFinite(state.recoveryProgressMinutes) ||
    state.recoveryProgressMinutes < 0 ||
    !Array.isArray(state.destroyedGeometryIds) ||
    state.destroyedGeometryIds.some(
      (id, index) =>
        typeof id !== 'string' ||
        id.length === 0 ||
        (index > 0 && state.destroyedGeometryIds[index - 1] >= id)
    )
  )
    throw new RangeError(
      'Anchor state must be finite and within its capacity.'
    );
}
