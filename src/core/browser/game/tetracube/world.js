import {
  createTetracubeState,
  deleteTetracube,
  getFreeTetracubeShapes,
  getTetracubeOccupiedCells,
  getTetracubeOrientations,
  placeTetracube,
  rotateTetracubeOrientation,
  settleTetracube,
  undoTetracube,
} from './tetracube.js';

/** @typedef {import('./tetracube.js').TetracubeCell} TetracubeCell */
/** @typedef {import('./tetracube.js').TetracubePiece} TetracubePiece */
/** @typedef {import('./tetracube.js').TetracubeState} TetracubeState */
/** @typedef {{id:string,shapeId:string,orientation:string,color:string}} TetracubeOffer */
/** @typedef {{construction:TetracubeState,offered:TetracubeOffer,randomState:number,sequence:number}} WorldSnapshot */
/** @typedef {{seed:number,randomState:number,sequence:number,construction:TetracubeState,offered:TetracubeOffer,player:{x:number,y:number,z:number,yaw:number,pitch:number},previewDistance:number,previewOffset:{x:number,y:number},undoStack:WorldSnapshot[],message:string}} TetracubeWorldState */

const DEFAULT_SEED = 0x3f01d;
const PIECE_COLORS = Object.freeze([
  '#8bcf82',
  '#e9bd67',
  '#db7d68',
  '#7fc7d1',
  '#b396d8',
  '#e393b6',
  '#b2c580',
  '#e8e2c9',
]);

/**
 * Advance a small deterministic xorshift generator.
 * @param {number} value Prior unsigned state.
 * @returns {{state:number,value:number}} Next generator state and fraction.
 */
function nextRandom(value) {
  let state = value >>> 0;
  state ^= state << 13;
  state ^= state >>> 17;
  state ^= state << 5;
  state >>>= 0;
  return { state, value: state / 0x100000000 };
}

/**
 * Draw one shape, orientation, and colour from a seeded stream.
 * @param {number} randomState Prior random state.
 * @param {number} sequence Piece number.
 * @returns {{offer:TetracubeOffer,randomState:number}} Offer and stream state.
 */
function drawOfferedPiece(randomState, sequence) {
  const shapes = getFreeTetracubeShapes();
  let draw = nextRandom(randomState);
  const shape = shapes[Math.floor(draw.value * shapes.length)];
  randomState = draw.state;
  const orientations = getTetracubeOrientations(shape.id);
  draw = nextRandom(randomState);
  const orientation =
    orientations[Math.floor(draw.value * orientations.length)];
  randomState = draw.state;
  draw = nextRandom(randomState);
  const color = PIECE_COLORS[Math.floor(draw.value * PIECE_COLORS.length)];
  randomState = draw.state;
  return {
    offer: {
      id: `piece-${sequence}`,
      shapeId: shape.id,
      orientation: orientation.id,
      color,
    },
    randomState,
  };
}

/**
 * Create a reproducible first-person tetracube construction world.
 * @param {number} [seed] Unsigned seed for the shape-and-colour stream.
 * @returns {TetracubeWorldState} Fresh world state.
 */
export function createTetracubeWorld(seed = DEFAULT_SEED) {
  const normalizedSeed = Number.isSafeInteger(seed) ? seed >>> 0 : DEFAULT_SEED;
  const safeSeed = normalizedSeed || DEFAULT_SEED;
  const drawn = drawOfferedPiece(safeSeed, 1);
  return {
    seed: safeSeed,
    randomState: drawn.randomState,
    sequence: 1,
    construction: createTetracubeState(),
    offered: drawn.offer,
    player: { x: 0, y: -5, z: 2.4, yaw: Math.PI / 2, pitch: -0.08 },
    previewDistance: 5,
    previewOffset: { x: 0, y: 0 },
    undoStack: [],
    message: 'Explore the open ground. Your piece follows the crosshair.',
  };
}

/**
 * Save the reversible interaction state before a construction action.
 * @param {TetracubeWorldState} state Current world.
 * @returns {WorldSnapshot[]} New world history.
 */
function historyWith(state) {
  return [
    ...state.undoStack,
    {
      construction: state.construction,
      offered: state.offered,
      randomState: state.randomState,
      sequence: state.sequence,
    },
  ];
}

/**
 * Calculate a camera-following ghost and its final settled location.
 * @param {TetracubeWorldState} state Current world.
 * @returns {{candidate:TetracubePiece,landedPiece:TetracubePiece|null,valid:boolean}} Preview data.
 */
/**
 * Calculate the offered piece's world-grid target position.
 * @param {TetracubeWorldState} state Current construction world.
 * @returns {{x:number,y:number}} Rounded horizontal grid location.
 */
function getPreviewPosition(state) {
  const { player, previewDistance, previewOffset } = state;
  return {
    x: Math.round(
      player.x +
        Math.cos(player.yaw) * Math.cos(player.pitch) * previewDistance +
        previewOffset.x
    ),
    y: Math.round(
      player.y +
        Math.sin(player.yaw) * Math.cos(player.pitch) * previewDistance +
        previewOffset.y
    ),
  };
}

/**
 *
 * @param state
 */
/**
 * Calculate a camera-following ghost and its final settled location.
 * @param {TetracubeWorldState} state Current world.
 * @returns {{candidate:TetracubePiece,landedPiece:TetracubePiece|null,valid:boolean}} Preview data.
 */
export function getTetracubePreview(state) {
  const { player, offered, construction } = state;
  const target = getPreviewPosition(state);
  const orientation = getTetracubeOrientations(offered.shapeId).find(
    item => item.id === offered.orientation
  );
  const center = orientation?.cells.reduce(
    (sum, cell) => ({
      x: sum.x + cell.x / orientation.cells.length,
      y: sum.y + cell.y / orientation.cells.length,
    }),
    { x: 0, y: 0 }
  ) || { x: 0, y: 0 };
  const position = {
    x: Math.round(target.x - center.x),
    y: Math.round(target.y - center.y),
  };
  const highestCell = construction.pieces
    .flatMap(piece => getTetracubeOccupiedCells(piece) || [])
    .reduce((maximum, cell) => Math.max(maximum, cell.z), 0);
  const startZ = Math.max(highestCell + 8, Math.ceil(player.z) + 8);
  const candidate = {
    id: offered.id,
    shapeId: offered.shapeId,
    orientation: offered.orientation,
    color: offered.color,
    position: { ...position, z: startZ },
  };
  const landedPiece = settleTetracube(construction, candidate);
  return { candidate, landedPiece, valid: landedPiece !== null };
}

/**
 * Move or fly in the camera's horizontal frame without structure collision.
 * @param {TetracubeWorldState} state Current world.
 * @param {[number?,number?,number?,number?]} movement Forward, strafe, vertical, and elapsed seconds.
 * @returns {TetracubeWorldState} Updated world.
 */
export function moveTetracubePlayer(state, movement = [0, 0, 0, 0]) {
  const seconds = Math.max(0, Math.min(0.1, movement[3] ?? 0));
  const scale = 5 * seconds;
  const forward = movement[0] ?? 0;
  const strafe = movement[1] ?? 0;
  const vertical = movement[2] ?? 0;
  const { yaw } = state.player;
  return {
    ...state,
    player: {
      ...state.player,
      x:
        state.player.x +
        Math.cos(yaw) * forward * scale -
        Math.sin(yaw) * strafe * scale,
      y:
        state.player.y +
        Math.sin(yaw) * forward * scale +
        Math.cos(yaw) * strafe * scale,
      z: state.player.z + vertical * scale,
    },
  };
}

/**
 * Turn the view while keeping piece orientation anchored to world axes.
 * @param {TetracubeWorldState} state Current world.
 * @param {{yaw?:number,pitch?:number}} change View change in radians.
 * @returns {TetracubeWorldState} Updated world.
 */
export function turnTetracubeView(state, change = {}) {
  return {
    ...state,
    player: {
      ...state.player,
      yaw: state.player.yaw + (change.yaw ?? 0),
      pitch: Math.max(
        -1.35,
        Math.min(1.35, state.player.pitch + (change.pitch ?? 0))
      ),
    },
  };
}

/**
 * Adjust the preview on the world grid or change its distance.
 * @param {TetracubeWorldState} state Current world.
 * @param {{x?:number,y?:number,distance?:number}} change Grid adjustment.
 * @returns {TetracubeWorldState} Updated world.
 */
export function adjustTetracubePreview(state, change = {}) {
  return {
    ...state,
    previewOffset: {
      x: state.previewOffset.x + (change.x ?? 0),
      y: state.previewOffset.y + (change.y ?? 0),
    },
    previewDistance: Math.max(
      2,
      Math.min(14, state.previewDistance + (change.distance ?? 0))
    ),
  };
}

/**
 * Rotate the offered piece about a world axis.
 * @param {TetracubeWorldState} state Current world.
 * @param {'x'|'y'|'z'} axis Explicit world axis.
 * @param {number} [turns] Signed quarter turns.
 * @returns {TetracubeWorldState} Updated world.
 */
export function rotateOfferedTetracube(state, axis, turns = 1) {
  const orientation = rotateTetracubeOrientation(
    state.offered.shapeId,
    state.offered.orientation,
    axis,
    turns
  );
  return orientation
    ? { ...state, offered: { ...state.offered, orientation } }
    : state;
}

/**
 * Return a visible placement rejection without changing construction state.
 * @param {TetracubeWorldState} state Current world.
 * @param {string} message Player-facing explanation.
 * @returns {{state:TetracubeWorldState,accepted:false,placedPiece:null}} Rejected action.
 */
function rejectPlacement(state, message) {
  return {
    state: { ...state, message },
    accepted: false,
    placedPiece: null,
  };
}

/**
 * Place the offered shape at its exact vertical-settling preview.
 * @param {TetracubeWorldState} state Current world.
 * @returns {{state:TetracubeWorldState,accepted:boolean,placedPiece:TetracubePiece|null}} Placement outcome.
 */
export function placeOfferedTetracube(state) {
  const preview = getTetracubePreview(state);
  if (!preview.valid)
    return rejectPlacement(
      state,
      'That landing space is blocked. Move the preview.'
    );
  const result = placeTetracube(state.construction, preview.candidate);
  const sequence = state.sequence + 1;
  const drawn = drawOfferedPiece(state.randomState, sequence);
  return {
    state: {
      ...state,
      construction: result.state,
      offered: drawn.offer,
      randomState: drawn.randomState,
      sequence,
      undoStack: historyWith(state),
      message: `${state.offered.shapeId} placed. A new piece is ready.`,
    },
    accepted: true,
    placedPiece: result.placedPiece,
  };
}

/**
 * Delete a placed tetracube and settle its unsupported neighbours.
 * @param {TetracubeWorldState} state Current world.
 * @param {string} pieceId Target stable identity.
 * @returns {{state:TetracubeWorldState,deleted:boolean}} Deletion outcome.
 */
export function mineTetracube(state, pieceId) {
  const result = deleteTetracube(state.construction, pieceId);
  if (!result.removedPiece) {
    return {
      state: { ...state, message: 'Aim at a built piece to mine it.' },
      deleted: false,
    };
  }
  return {
    state: {
      ...state,
      construction: result.state,
      undoStack: historyWith(state),
      message: 'Piece mined. Unsupported pieces settled.',
    },
    deleted: true,
  };
}

/**
 * Restore the prior construction, offered piece, and random stream.
 * @param {TetracubeWorldState} state Current world.
 * @returns {TetracubeWorldState} Reverted world or unchanged state without history.
 */
export function undoTetracubeWorld(state) {
  const previous = state.undoStack.at(-1);
  if (!previous) return { ...state, message: 'There is nothing to undo yet.' };
  return {
    ...state,
    construction: undoTetracube(state.construction),
    offered: previous.offered,
    randomState: previous.randomState,
    sequence: previous.sequence,
    undoStack: state.undoStack.slice(0, -1),
    message: 'Undone.',
  };
}

/**
 * Find the closest placed piece centered beneath the player's crosshair.
 * @param {TetracubeWorldState} state Current world.
 * @param {number} [tolerance] Maximum perpendicular distance from view ray.
 * @returns {string|null} Stable piece ID under the reticle.
 */
export function targetTetracubePiece(state, tolerance = 2) {
  const { player } = state;
  const direction = {
    x: Math.cos(player.yaw) * Math.cos(player.pitch),
    y: Math.sin(player.yaw) * Math.cos(player.pitch),
    z: Math.sin(player.pitch),
  };
  let target = null;
  let closest = Infinity;
  for (const piece of state.construction.pieces) {
    const cells = getTetracubeOccupiedCells(piece) || [];
    if (!cells.length) continue;
    const center = cells.reduce(
      (sum, cell) => ({
        x: sum.x + cell.x + 0.5,
        y: sum.y + cell.y + 0.5,
        z: sum.z + 0.5,
      }),
      { x: 0, y: 0, z: 0 }
    );
    center.x /= cells.length;
    center.y /= cells.length;
    center.z /= cells.length;
    const offset = {
      x: center.x - player.x,
      y: center.y - player.y,
      z: center.z - player.z,
    };
    const along =
      offset.x * direction.x + offset.y * direction.y + offset.z * direction.z;
    if (along <= 0 || along >= closest) continue;
    const perpendicular = Math.hypot(
      offset.x - direction.x * along,
      offset.y - direction.y * along,
      offset.z - direction.z * along
    );
    if (perpendicular <= tolerance) {
      target = piece.id;
      closest = along;
    }
  }
  return target;
}

/**
 * Reset construction and piece stream to the original seed.
 * @param {TetracubeWorldState} state Current world.
 * @returns {TetracubeWorldState} Fresh world.
 */
export function resetTetracubeWorld(state) {
  return createTetracubeWorld(state.seed);
}
