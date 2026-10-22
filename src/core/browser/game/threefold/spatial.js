export const MIN_SCALE = -4;
export const MAX_SCALE = 4;
export const BASE_HEIGHT_METERS = 1.8288;
export const INITIAL_MAX_ANCHOR = 8;
const GEOMETRY_CONTACT_TOLERANCE_METERS = 1e-9;
const BASE_MOVEMENT_METERS = BASE_HEIGHT_METERS / 9;
/** @type {Array<'x' | 'y' | 'z'>} */
const GEOMETRY_AXES = ['x', 'y', 'z'];
/** @type {Array<'x' | 'y'>} */
const WORLD_AXES = ['x', 'y'];
/** @type {Record<string, {x: number, y: number}>} */
const MOVEMENT_DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/**
 * Create deterministic scale state with a bounded Anchor reserve.
 * @param {{x: number, y: number}} position Canonical position in metres.
 * @param {{scale?: number, anchor?: number, maximumAnchor?: number, minimumUnlockedScale?: number, maximumUnlockedScale?: number, recoveryProgressMinutes?: number, destroyedGeometryIds?: string[]}} options Initial tuning, unlocks and persistent world changes.
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
    recoveryProgressMinutes: options.recoveryProgressMinutes ?? 0,
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
 * Grow one scale rung and permanently collapse geometry newly intersected by the body.
 * @param {ReturnType<typeof createScaleState>} state Current state.
 * @param {Array<{id: string, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}}>} geometry Canonical world geometry.
 * @param {number} baseBodyWidthMeters Body width at scale zero.
 * @returns {ReturnType<typeof createScaleState>} Updated state, or the original state when growth is unavailable.
 */
export function growThroughGeometry(state, geometry, baseBodyWidthMeters) {
  const newlyIntersectedIds = previewGrowthDamageIds(
    state,
    geometry,
    baseBodyWidthMeters
  );
  return changeScale(state, 1, newlyIntersectedIds);
}

/**
 * Preview the intact geometry that the next growth rung will newly intersect.
 * The result uses the same physical-volume rule as committed growth and does
 * not change the supplied state.
 * @param {ReturnType<typeof createScaleState>} state Current state.
 * @param {Array<{id: string, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}}>} geometry Canonical world geometry.
 * @param {number} baseBodyWidthMeters Body width at scale zero.
 * @returns {string[]} Sorted identifiers of intact geometry newly intersected by growth.
 */
export function previewGrowthDamageIds(state, geometry, baseBodyWidthMeters) {
  return previewGrowthIds(
    state,
    geometry,
    baseBodyWidthMeters,
    isNewGrowthIntersection
  );
}

/**
 * Preview volumes overlapped by the next growth body, including volumes the
 * current smaller body already occupies. This is used for living occupants:
 * growing while inside an occupant is lethal even without a new intersection.
 * @param {ReturnType<typeof createScaleState>} state Current state.
 * @param {Array<{id: string, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}}>} volumes Canonical occupant volumes.
 * @param {number} baseBodyWidthMeters Body width at scale zero.
 * @returns {string[]} Sorted identifiers overlapped by the next growth body.
 */
export function previewGrowthOverlapIds(state, volumes, baseBodyWidthMeters) {
  return previewGrowthIds(state, volumes, baseBodyWidthMeters, isGrowthOverlap);
}

/**
 * Validate inputs, compute the next scale, and collect matching volume IDs.
 * @param {ReturnType<typeof createScaleState>} state Current state.
 * @param {Array<{id: string, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}}>} volumes Candidate physical volumes.
 * @param {number} baseBodyWidthMeters Body width at scale zero.
 * @param {(current: ReturnType<typeof createScaleState>, next: ReturnType<typeof createScaleState>, object: {id: string, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}}, baseBodyWidthMeters: number) => boolean} isImpact Volume impact rule.
 * @returns {string[]} Sorted matching identifiers.
 */
function previewGrowthIds(state, volumes, baseBodyWidthMeters, isImpact) {
  assertScaleState(state);
  assertBodyWidth(baseBodyWidthMeters);
  const objects = validateGeometry(volumes);
  const next = changeScale(state, 1);
  if (next === state) return [];
  return normalizeGeometryIds(
    objects
      .filter(object => isImpact(state, next, object, baseBodyWidthMeters))
      .map(object => object.id)
  );
}

/**
 * Move one deterministic step in canonical metres, blocking on intact geometry.
 * One step is one ninth of Mara's scale-zero height and scales by powers of 3.
 * @param {ReturnType<typeof createScaleState>} state Current scale state.
 * @param {string} direction Cardinal movement direction.
 * @param {Array<{id: string, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}}>} geometry Canonical world geometry.
 * @param {{baseBodyWidthMeters: number, bounds: {min: {x: number, y: number}, max: {x: number, y: number}}}} scene Canonical world body tuning and finite extent in metres.
 * @returns {ReturnType<typeof createScaleState>} Updated position or original state when blocked.
 */
export function moveAtScale(state, direction, geometry, scene) {
  assertScaleState(state);
  assertBodyWidth(scene.baseBodyWidthMeters);
  const objects = validateGeometry(geometry);
  assertWorldBounds(scene.bounds);
  const delta = MOVEMENT_DIRECTIONS[direction];
  if (!delta) return state;
  const distance = BASE_MOVEMENT_METERS * 3 ** state.scale;
  const destination = {
    ...state,
    position: {
      x: state.position.x + delta.x * distance,
      y: state.position.y + delta.y * distance,
    },
  };
  const currentBody = bodyBoundsAtScale(state, scene.baseBodyWidthMeters);
  const destinationBody = bodyBoundsAtScale(
    destination,
    scene.baseBodyWidthMeters
  );
  if (
    !containsInWorld(destinationBody, scene.bounds) ||
    crossesIntactGeometry(
      currentBody,
      destinationBody,
      objects,
      state.destroyedGeometryIds
    )
  )
    return state;
  return destination;
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
 * Project canonical geometry into a scale view, omitting committed rubble.
 * Geometry remains in physical metres so every scale reads the same world.
 * @param {ReturnType<typeof createScaleState>} state Current scale and damage state.
 * @param {Array<{id: string, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}, overlapGroupId?: string}>} geometry Canonical geometry for the loaded region or chunk.
 * @returns {{view: ReturnType<typeof viewAtScale>, geometry: Array<{id: string, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}, overlapGroupId?: string}>}} Scale view and surviving canonical geometry with authored grid relationships.
 */
export function projectGeometryForScale(state, geometry) {
  assertScaleState(state);
  const objects = validateGeometry(geometry);
  const destroyed = new Set(state.destroyedGeometryIds);
  return {
    view: viewAtScale(state.position, state.scale),
    geometry: objects
      .filter(object => !destroyed.has(object.id))
      .sort((first, second) => (first.id < second.id ? -1 : 1))
      .map(object => ({
        id: object.id,
        ...(object.overlapGroupId === undefined
          ? {}
          : { overlapGroupId: object.overlapGroupId }),
        bounds: {
          min: { ...object.bounds.min },
          max: { ...object.bounds.max },
        },
      })),
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
 * Validate an explicit physical body width.
 * @param {number} width Body width in metres at scale zero.
 * @returns {void}
 */
function assertBodyWidth(width) {
  if (!Number.isFinite(width) || width <= 0)
    throw new RangeError('Base body width must be a positive finite distance.');
}

/**
 * Validate a finite rectangular world boundary.
 * @param {{min: {x: number, y: number}, max: {x: number, y: number}}} bounds Candidate world bounds.
 * @returns {void}
 */
function assertWorldBounds(bounds) {
  if (!bounds?.min || !bounds?.max)
    throw new TypeError(
      'World bounds require minimum and maximum coordinates.'
    );
  WORLD_AXES.forEach(axis => {
    if (
      !Number.isFinite(bounds.min[axis]) ||
      !Number.isFinite(bounds.max[axis]) ||
      bounds.min[axis] >= bounds.max[axis]
    ) {
      throw new RangeError(`World bounds require increasing ${axis} limits.`);
    }
  });
}

/**
 * Validate canonical geometry bounds and unique identifiers.
 * @param {Array<{id: string, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}, overlapGroupId?: string}>} geometry Candidate geometry.
 * @returns {Array<{id: string, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}, overlapGroupId?: string}>} Validated geometry.
 */
function validateGeometry(geometry) {
  if (!Array.isArray(geometry))
    throw new TypeError('World geometry must be an array.');
  const ids = new Set();
  geometry.forEach(object => {
    assertGeometryObject(object);
    if (ids.has(object.id))
      throw new RangeError(`World geometry ID is duplicated: ${object.id}.`);
    ids.add(object.id);
  });
  return geometry;
}

/**
 * Validate one axis-aligned geometry object.
 * @param {{id: string, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}}} object Candidate object.
 * @returns {void}
 */
function assertGeometryObject(object) {
  const { id, bounds } = object ?? {};
  if (typeof id !== 'string' || id.length === 0)
    throw new TypeError('World geometry requires a non-empty ID.');
  if (!bounds?.min || !bounds?.max)
    throw new TypeError('World geometry requires minimum and maximum bounds.');
  GEOMETRY_AXES.forEach(axis => {
    const min = bounds.min[axis];
    const max = bounds.max[axis];
    if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max)
      throw new RangeError(
        `World geometry requires increasing ${axis} bounds.`
      );
  });
}

/**
 * Return whether an object overlaps the destination body but not its current body.
 * @param {ReturnType<typeof createScaleState>} current Current scale state.
 * @param {ReturnType<typeof createScaleState>} next Destination scale state.
 * @param {{id: string, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}}} object Geometry candidate.
 * @param {number} baseBodyWidthMeters Body width at scale zero.
 * @returns {boolean} True when growth newly intersects the object.
 */
function isNewGrowthIntersection(current, next, object, baseBodyWidthMeters) {
  if (current.destroyedGeometryIds.includes(object.id)) return false;
  const oldBody = bodyBoundsAtScale(current, baseBodyWidthMeters);
  const newBody = bodyBoundsAtScale(next, baseBodyWidthMeters);
  return overlaps(newBody, object.bounds) && !overlaps(oldBody, object.bounds);
}

/**
 * @param {ReturnType<typeof createScaleState>} _current Current smaller body state.
 * @param {ReturnType<typeof createScaleState>} next Proposed grown body state.
 * @param {{id: string, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}}} object Candidate living volume.
 * @param {number} baseBodyWidthMeters Body width at scale zero.
 * @returns {boolean} Whether the proposed grown body overlaps the volume.
 */
function isGrowthOverlap(_current, next, object, baseBodyWidthMeters) {
  return overlaps(bodyBoundsAtScale(next, baseBodyWidthMeters), object.bounds);
}

/**
 * Calculate Mara's axis-aligned physical volume at one scale.
 * @param {ReturnType<typeof createScaleState>} state State supplying position and scale.
 * @param {number} baseBodyWidthMeters Body width at scale zero.
 * @returns {{min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}} Body bounds.
 */
function bodyBoundsAtScale(state, baseBodyWidthMeters) {
  const width = baseBodyWidthMeters * 3 ** state.scale;
  const halfWidth = width / 2;
  return {
    min: {
      x: state.position.x - halfWidth,
      y: state.position.y - halfWidth,
      z: 0,
    },
    max: {
      x: state.position.x + halfWidth,
      y: state.position.y + halfWidth,
      z: heightAtScale(state.scale),
    },
  };
}

/**
 * Check the full swept body against the finite world and intact geometry.
 * @param {{min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}} body Candidate body bounds.
 * @param {{min: {x: number, y: number}, max: {x: number, y: number}}} worldBounds World boundary.
 * @returns {boolean} Whether the body fits in the world.
 */
function containsInWorld(body, worldBounds) {
  return (
    body.min.x >= worldBounds.min.x &&
    body.min.y >= worldBounds.min.y &&
    body.max.x <= worldBounds.max.x &&
    body.max.y <= worldBounds.max.y
  );
}

/**
 * Check whether an axis-aligned movement sweep reaches an intact object.
 * @param {{min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}} start Body bounds before movement.
 * @param {{min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}} end Body bounds after movement.
 * @param {Array<{id: string, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}}>} geometry Validated world geometry.
 * @param {string[]} destroyedGeometryIds Persistent rubble IDs.
 * @returns {boolean} Whether movement intersects intact geometry.
 */
function crossesIntactGeometry(start, end, geometry, destroyedGeometryIds) {
  const destroyed = new Set(destroyedGeometryIds);
  const swept = {
    min: {
      x: Math.min(start.min.x, end.min.x),
      y: Math.min(start.min.y, end.min.y),
      z: start.min.z,
    },
    max: {
      x: Math.max(start.max.x, end.max.x),
      y: Math.max(start.max.y, end.max.y),
      z: start.max.z,
    },
  };
  return geometry.some(
    object => !destroyed.has(object.id) && overlaps(swept, object.bounds)
  );
}

/**
 * Check strict overlap between two axis-aligned boxes.
 * @param {{min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}} first First box.
 * @param {{min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}} second Second box.
 * @returns {boolean} Whether their volumes overlap.
 */
function overlaps(first, second) {
  return GEOMETRY_AXES.every(
    axis =>
      first.min[axis] < second.max[axis] - GEOMETRY_CONTACT_TOLERANCE_METERS &&
      first.max[axis] > second.min[axis] + GEOMETRY_CONTACT_TOLERANCE_METERS
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
