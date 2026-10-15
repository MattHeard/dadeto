export const MIN_SCALE = -4;
export const MAX_SCALE = 4;
export const BASE_HEIGHT_METERS = 1.8288;

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
 * @param {{scale: number, position: {x: number, y: number}}} state Current state.
 * @param {number} direction One adjacent scale step, -1 or +1.
 * @returns {{scale: number, position: {x: number, y: number}}} Updated state.
 */
export function changeScale(state, direction) {
  assertScale(state.scale);
  assertPosition(state.position);
  if (direction !== -1 && direction !== 1)
    throw new RangeError('Scale changes must move one level at a time.');
  const scale = state.scale + direction;
  if (scale < MIN_SCALE || scale > MAX_SCALE) return state;
  return { ...state, position: { ...state.position }, scale };
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
