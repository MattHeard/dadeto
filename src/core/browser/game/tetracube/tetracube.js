/** @typedef {{x:number,y:number,z:number}} TetracubeCell */
/** @typedef {{id:string,shapeId:string,orientation:string,position:TetracubeCell,color?:string,ghost?:boolean}} TetracubePiece */
/** @typedef {{id:string,key:string,cells:Array<TetracubeCell>}} TetracubeShape */
/** @typedef {{id:string,cells:Array<TetracubeCell>}} TetracubeOrientation */
/** @typedef {{pieces:TetracubePiece[],undoStack:TetracubePiece[][]}} TetracubeState */

const FACE_STEPS = Object.freeze([
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
]);
const AXIS_PERMUTATIONS = Object.freeze([
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
]);
const SIGNS = Object.freeze([-1, 1]);

/**
 * Return the sign of an axis permutation.
 * @param {number[]} permutation Output-axis to input-axis mapping.
 * @returns {number} Permutation parity, either -1 or 1.
 */
function permutationParity(permutation) {
  let inversions = 0;
  for (let left = 0; left < permutation.length; left += 1) {
    for (let right = left + 1; right < permutation.length; right += 1) {
      if (permutation[left] > permutation[right]) inversions += 1;
    }
  }
  return inversions % 2 === 0 ? 1 : -1;
}

const ROTATIONS = Object.freeze(
  AXIS_PERMUTATIONS.flatMap(permutation =>
    SIGNS.flatMap(x =>
      SIGNS.flatMap(y =>
        SIGNS.filter(z => permutationParity(permutation) * x * y * z === 1).map(
          z => Object.freeze({ permutation, signs: [x, y, z] })
        )
      )
    )
  )
);

/**
 * Normalize cells to a translated, stable coordinate ordering.
 * @param {Array<TetracubeCell>} cells Input cells.
 * @returns {{x:number,y:number,z:number}[]} Normalized cells.
 */
function normalizeCells(cells) {
  const minimum = [
    Math.min(...cells.map(cell => cell.x)),
    Math.min(...cells.map(cell => cell.y)),
    Math.min(...cells.map(cell => cell.z)),
  ];
  return cells
    .map(cell => ({
      x: cell.x - minimum[0],
      y: cell.y - minimum[1],
      z: cell.z - minimum[2],
    }))
    .sort(
      (left, right) => left.x - right.x || left.y - right.y || left.z - right.z
    );
}

/**
 * Serialize normalized cells into a canonical key.
 * @param {Array<TetracubeCell>} cells Cells.
 * @returns {string} Stable coordinate key.
 */
function cellsKey(cells) {
  return cells.map(({ x, y, z }) => `${x},${y},${z}`).join(';');
}

/**
 * Apply one of the 24 orientation-preserving cube rotations.
 * @param {Array<TetracubeCell>} cells Cells to rotate.
 * @param {{permutation:number[],signs:number[]}} rotation Rotation mapping.
 * @returns {{x:number,y:number,z:number}[]} Rotated and normalized cells.
 */
function rotateCells(cells, rotation) {
  return normalizeCells(
    cells.map(cell => {
      const coordinates = [cell.x, cell.y, cell.z];
      return {
        x: rotation.signs[0] * coordinates[rotation.permutation[0]],
        y: rotation.signs[1] * coordinates[rotation.permutation[1]],
        z: rotation.signs[2] * coordinates[rotation.permutation[2]],
      };
    })
  );
}

/**
 * Return the canonical key among all proper cube rotations.
 * @param {Array<TetracubeCell>} cells Shape cells.
 * @returns {string} Canonical key.
 */
function canonicalShapeKey(cells) {
  return ROTATIONS.map(rotation =>
    cellsKey(rotateCells(cells, rotation))
  ).sort()[0];
}

/**
 * Add every face-connected one-cell expansion to the shape set.
 * @param {{x:number,y:number,z:number}[]} cells Current shape cells.
 * @param {Map<string,TetracubeCell[]>} next Expanded shape set.
 * @returns {void}
 */
function addConnectedExpansions(cells, next) {
  const occupied = new Set(
    cells.map(cell => [cell.x, cell.y, cell.z].join(','))
  );
  for (const cell of cells) {
    for (const [dx, dy, dz] of FACE_STEPS) {
      const candidate = { x: cell.x + dx, y: cell.y + dy, z: cell.z + dz };
      if (occupied.has([candidate.x, candidate.y, candidate.z].join(',')))
        continue;
      const normalized = normalizeCells([...cells, candidate]);
      next.set(cellsKey(normalized), normalized);
    }
  }
}

/**
 * Enumerate translation-normalized connected cell sets of a given size.
 * @param {number} size Number of face-connected cells.
 * @returns {{x:number,y:number,z:number}[][]} Unique translated shapes.
 */
function enumerateConnectedShapes(size) {
  let shapes = new Map([['0,0,0', [{ x: 0, y: 0, z: 0 }]]]);
  for (let count = 1; count < size; count += 1) {
    const next = new Map();
    for (const cells of shapes.values()) addConnectedExpansions(cells, next);
    shapes = next;
  }
  return [...shapes.values()];
}

const SHAPES = Object.freeze(
  [
    ...new Map(
      enumerateConnectedShapes(4).map(cells => [
        canonicalShapeKey(cells),
        cells,
      ])
    ),
  ]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(
      ([key, cells], index) =>
        /** @type {TetracubeShape} */ (
          Object.freeze({
            id: `tetracube-${index + 1}`,
            key,
            cells: Object.freeze(cells.map(cell => Object.freeze({ ...cell }))),
          })
        )
    )
);
/** @type {Map<string,TetracubeShape>} */
const SHAPES_BY_ID = new Map(
  SHAPES.map(
    shape => /** @type {[string,TetracubeShape]} */ ([shape.id, shape])
  )
);

/**
 * Return the eight canonical free tetracube shapes.
 * @returns {Array<TetracubeShape>} Canonical shapes.
 */
export function getFreeTetracubeShapes() {
  return SHAPES.map(shape => shape);
}

/**
 * Return unique orientations generated by proper cube rotations.
 * @param {string} shapeId Canonical shape identifier.
 * @returns {TetracubeOrientation[]} Unique orientations.
 */
export function getTetracubeOrientations(shapeId) {
  const shape = SHAPES_BY_ID.get(shapeId);
  if (!shape) return [];
  const orientations = new Map();
  for (const rotation of ROTATIONS) {
    const cells = rotateCells(shape.cells, rotation);
    orientations.set(cellsKey(cells), cells);
  }
  return [...orientations.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([id, cells]) => ({ id, cells }));
}

/**
 * Rotate an orientation around a world axis by quarter turns.
 * @param {string} shapeId Canonical shape identifier.
 * @param {string} orientationId Current orientation key.
 * @param {'x'|'y'|'z'} axis World rotation axis.
 * @param {number} [quarterTurns] Signed number of 90-degree turns.
 * @returns {string|null} Result orientation key, or null for invalid input.
 */
export function rotateTetracubeOrientation(
  shapeId,
  orientationId,
  axis,
  quarterTurns = 1
) {
  const orientation = getTetracubeOrientations(shapeId).find(
    item => item.id === orientationId
  );
  if (!orientation || !['x', 'y', 'z'].includes(axis)) return null;
  if (!Number.isSafeInteger(quarterTurns)) return null;
  const turns = ((quarterTurns % 4) + 4) % 4;
  let cells = orientation.cells;
  for (let turn = 0; turn < turns; turn += 1) {
    cells = normalizeCells(
      cells.map(({ x, y, z }) => {
        if (axis === 'x') return { x, y: -z, z: y };
        if (axis === 'y') return { x: z, y, z: -x };
        return { x: -y, y: x, z };
      })
    );
  }
  return cellsKey(cells);
}

/**
 * Create an immutable-by-convention snapshot of the construction.
 * @param {TetracubePiece[]} [pieces] Initial pieces.
 * @returns {TetracubeState} Fresh model state.
 */
export function createTetracubeState(pieces = []) {
  return { pieces: pieces.map(clonePiece), undoStack: [] };
}

/**
 * Clone a placed tetracube record.
 * @param {TetracubePiece} piece Piece record.
 * @returns {TetracubePiece} Independent piece record.
 */
function clonePiece(piece) {
  return { ...piece, position: { ...piece.position } };
}

/**
 * Resolve a piece's occupied world cells, returning null for malformed records.
 * @param {Partial<TetracubePiece>|null|undefined} piece Candidate piece.
 * @returns {{x:number,y:number,z:number}[]|null} World cells.
 */
export function getTetracubeOccupiedCells(piece) {
  const position = piece?.position;
  if (
    !piece ||
    typeof piece.id !== 'string' ||
    !piece.id ||
    typeof piece.shapeId !== 'string' ||
    typeof piece.orientation !== 'string' ||
    !position ||
    !Number.isSafeInteger(position.x) ||
    !Number.isSafeInteger(position.y) ||
    !Number.isSafeInteger(position.z)
  )
    return null;
  const orientation = getTetracubeOrientations(piece.shapeId).find(
    item => item.id === piece.orientation
  );
  if (!orientation) return null;
  return orientation.cells.map(cell => ({
    x: cell.x + position.x,
    y: cell.y + position.y,
    z: cell.z + position.z,
  }));
}

/**
 * Check whether a candidate is valid and does not overlap the construction.
 * @param {TetracubeState} state Current construction.
 * @param {TetracubePiece} piece Candidate piece.
 * @returns {boolean} Whether the candidate can be placed at its current position.
 */
export function canPlaceTetracube(state, piece) {
  if (!state || !Array.isArray(state.pieces)) return false;
  if (state.pieces.some(existing => existing.id === piece?.id)) return false;
  const candidateCells = getTetracubeOccupiedCells(piece);
  if (!candidateCells || candidateCells.some(cell => cell.z < 0)) return false;
  const occupied = new Set();
  for (const existing of state.pieces) {
    const cells = getTetracubeOccupiedCells(existing);
    if (!cells || cells.some(cell => cell.z < 0)) return false;
    for (const cell of cells) occupied.add(cellsKey([cell]));
  }
  return candidateCells.every(cell => !occupied.has(cellsKey([cell])));
}

/**
 * Move a valid candidate down as one rigid piece until first contact.
 * @param {TetracubeState} state Current construction.
 * @param {TetracubePiece} piece Candidate piece.
 * @returns {TetracubePiece|null} Settled candidate or null when initially invalid.
 */
export function settleTetracube(state, piece) {
  if (!canPlaceTetracube(state, piece)) return null;
  let settled = clonePiece(piece);
  while (settled.position.z > 0) {
    const lower = {
      ...settled,
      position: { ...settled.position, z: settled.position.z - 1 },
    };
    if (!canPlaceTetracube(state, lower)) break;
    settled = lower;
  }
  return settled;
}

/**
 * Place a piece at its rigidly settled position, retaining an undo snapshot.
 * @param {TetracubeState} state Current construction.
 * @param {TetracubePiece} piece Candidate piece.
 * @returns {{state:TetracubeState,placedPiece:TetracubePiece|null,accepted:boolean}} Placement result.
 */
export function placeTetracube(state, piece) {
  const placedPiece = settleTetracube(state, piece);
  if (!placedPiece) return { state, placedPiece: null, accepted: false };
  return {
    state: {
      pieces: [...state.pieces.map(clonePiece), placedPiece],
      undoStack: [...(state.undoStack || []), state.pieces.map(clonePiece)],
    },
    placedPiece: clonePiece(placedPiece),
    accepted: true,
  };
}

/**
 * Check whether one piece can move down by one cell in a construction.
 * @param {TetracubePiece[]} pieces Current pieces.
 * @param {TetracubePiece} piece Piece to test.
 * @returns {boolean} Whether it can move down one cell.
 */
function canMoveDown(pieces, piece) {
  if (piece.position.z <= 0) return false;
  const otherPieces = pieces.filter(other => other.id !== piece.id);
  return canPlaceTetracube(
    { pieces: otherPieces, undoStack: [] },
    { ...piece, position: { ...piece.position, z: piece.position.z - 1 } }
  );
}

/**
 * Settle all pieces deterministically, moving lower pieces first until stable.
 * @param {TetracubePiece[]} pieces Piece records.
 * @returns {TetracubePiece[]} Settled pieces.
 */
function settleConstruction(pieces) {
  const settled = pieces.map(clonePiece);
  let moved = true;
  while (moved) {
    moved = false;
    settled.sort(
      (left, right) =>
        left.position.z - right.position.z || left.id.localeCompare(right.id)
    );
    for (const piece of settled) {
      while (canMoveDown(settled, piece)) {
        piece.position.z -= 1;
        moved = true;
      }
    }
  }
  return settled.sort((left, right) => left.id.localeCompare(right.id));
}

/**
 * Delete one placed piece and immediately settle any unsupported pieces.
 * @param {TetracubeState} state Current construction.
 * @param {string} pieceId Stable ID to remove.
 * @returns {{state:TetracubeState,removedPiece:TetracubePiece|null}} Updated construction.
 */
export function deleteTetracube(state, pieceId) {
  const removedPiece = state.pieces.find(piece => piece.id === pieceId);
  if (!removedPiece) return { state, removedPiece: null };
  const remaining = state.pieces.filter(piece => piece.id !== pieceId);
  return {
    state: {
      pieces: settleConstruction(remaining),
      undoStack: [...(state.undoStack || []), state.pieces.map(clonePiece)],
    },
    removedPiece: clonePiece(removedPiece),
  };
}

/**
 * Restore the most recent placement or deletion snapshot.
 * @param {TetracubeState} state Current construction.
 * @returns {TetracubeState} Restored state, or input if unavailable.
 */
export function undoTetracube(state) {
  const snapshot = state?.undoStack.at(-1);
  if (!snapshot) return state;
  return {
    pieces: snapshot.map(clonePiece),
    undoStack: state.undoStack.slice(0, -1),
  };
}
