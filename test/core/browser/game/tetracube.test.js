import {
  canPlaceTetracube,
  createTetracubeState,
  deleteTetracube,
  getFreeTetracubeShapes,
  getTetracubeOccupiedCells,
  getTetracubeOrientations,
  placeTetracube,
  settleTetracube,
  rotateTetracubeOrientation,
  undoTetracube,
} from '../../../../src/core/browser/game/tetracube/tetracube.js';

const shapes = getFreeTetracubeShapes();
const shapeWithOrientation = predicate =>
  shapes
    .flatMap(shape =>
      getTetracubeOrientations(shape.id).map(orientation => ({
        shapeId: shape.id,
        orientation: orientation.id,
        cells: orientation.cells,
      }))
    )
    .find(predicate);
const xLine = shapeWithOrientation(
  item =>
    item.cells.length === 4 &&
    item.cells.every(cell => cell.y === 0 && cell.z === 0)
);
const zLine = shapeWithOrientation(
  item =>
    item.cells.length === 4 &&
    item.cells.every(cell => cell.x === 0 && cell.y === 0)
);
const makePiece = (id, oriented, position) => ({
  id,
  shapeId: oriented.shapeId,
  orientation: oriented.orientation,
  position,
});
const hasOverlap = pieces => {
  const seen = new Set();
  for (const piece of pieces) {
    for (const cell of getTetracubeOccupiedCells(piece) || []) {
      const key = `${cell.x},${cell.y},${cell.z}`;
      if (seen.has(key)) return true;
      seen.add(key);
    }
  }
  return false;
};

describe('Tetracube canonical shapes and orientations', () => {
  test('enumerates exactly eight distinct, connected four-cell free shapes', () => {
    expect(shapes).toHaveLength(8);
    const canonicalKeys = shapes.map(
      shape =>
        getTetracubeOrientations(shape.id)
          .map(orientation => orientation.id)
          .sort()[0]
    );
    expect(new Set(canonicalKeys).size).toBe(8);
    for (const shape of shapes) {
      expect(shape.cells).toHaveLength(4);
      const connected = new Set([
        `${shape.cells[0].x},${shape.cells[0].y},${shape.cells[0].z}`,
      ]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const cell of shape.cells) {
          const key = `${cell.x},${cell.y},${cell.z}`;
          if (connected.has(key)) continue;
          if (
            shape.cells.some(
              other =>
                connected.has(`${other.x},${other.y},${other.z}`) &&
                Math.abs(cell.x - other.x) +
                  Math.abs(cell.y - other.y) +
                  Math.abs(cell.z - other.z) ===
                  1
            )
          ) {
            connected.add(key);
            changed = true;
          }
        }
      }
      expect(connected.size).toBe(4);
    }
  });

  test('enumerates no more than 24 unique proper orientations per shape', () => {
    for (const shape of shapes) {
      const orientations = getTetracubeOrientations(shape.id);
      expect(orientations.length).toBeGreaterThan(0);
      expect(orientations.length).toBeLessThanOrEqual(24);
      expect(
        new Set(orientations.map(orientation => orientation.id)).size
      ).toBe(orientations.length);
      for (const orientation of orientations) {
        expect(orientation.cells).toHaveLength(4);
        expect(orientation.cells).toEqual(
          [...orientation.cells].sort(
            (left, right) =>
              left.x - right.x || left.y - right.y || left.z - right.z
          )
        );
      }
    }
  });

  test('rotates around all world axes and returns to the original orientation', () => {
    for (const axis of ['x', 'y', 'z']) {
      const rotated = rotateTetracubeOrientation(
        xLine.shapeId,
        xLine.orientation,
        axis
      );
      expect(rotated).not.toBeNull();
      expect(rotateTetracubeOrientation(xLine.shapeId, rotated, axis, 3)).toBe(
        xLine.orientation
      );
    }
    expect(
      rotateTetracubeOrientation(xLine.shapeId, xLine.orientation, 'x', 4)
    ).toBe(xLine.orientation);
  });

  test('rejects unknown rotations and invalid turn counts', () => {
    expect(
      rotateTetracubeOrientation('missing', 'orientation', 'x')
    ).toBeNull();
    expect(
      rotateTetracubeOrientation(xLine.shapeId, xLine.orientation, 'q')
    ).toBeNull();
    expect(
      rotateTetracubeOrientation(xLine.shapeId, xLine.orientation, 'x', 1.5)
    ).toBeNull();
  });

  test('returns no orientations for an unknown shape', () => {
    expect(getTetracubeOrientations('not-a-shape')).toEqual([]);
  });

  test('returns null for malformed pieces and derives translated occupied cells', () => {
    expect(getTetracubeOccupiedCells(null)).toBeNull();
    expect(getTetracubeOccupiedCells({ id: 'x' })).toBeNull();
    expect(
      getTetracubeOccupiedCells(makePiece('p', xLine, { x: 2, y: -1, z: 3 }))
    ).toEqual([
      { x: 2, y: -1, z: 3 },
      { x: 3, y: -1, z: 3 },
      { x: 4, y: -1, z: 3 },
      { x: 5, y: -1, z: 3 },
    ]);
  });
});

describe('Tetracube placement and rigid settling', () => {
  test('drops a valid piece to ground and preserves its identity and orientation', () => {
    const piece = makePiece('falling', xLine, { x: -3, y: 5, z: 9 });
    const settled = settleTetracube(createTetracubeState(), piece);
    expect(settled).toEqual({ ...piece, position: { x: -3, y: 5, z: 0 } });
    expect(piece.position.z).toBe(9);
  });

  test('a single voxel supports a rigid overhang without tipping', () => {
    const support = makePiece('support', zLine, { x: 0, y: 0, z: 0 });
    const supportState = createTetracubeState([support]);
    const bridge = makePiece('bridge', xLine, { x: 0, y: 0, z: 8 });
    expect(settleTetracube(supportState, bridge)).toEqual({
      ...bridge,
      position: { x: 0, y: 0, z: 4 },
    });
  });

  test.each([
    ['negative height', makePiece('bad', xLine, { x: 0, y: 0, z: -1 })],
    [
      'unknown orientation',
      {
        id: 'bad',
        shapeId: xLine.shapeId,
        orientation: 'bad',
        position: { x: 0, y: 0, z: 0 },
      },
    ],
    ['non-integer coordinate', makePiece('bad', xLine, { x: 0.5, y: 0, z: 0 })],
  ])('rejects %s without mutating the state', (_label, invalidPiece) => {
    const state = createTetracubeState();
    expect(canPlaceTetracube(state, invalidPiece)).toBe(false);
    expect(settleTetracube(state, invalidPiece)).toBeNull();
    expect(state).toEqual({ pieces: [], undoStack: [] });
  });

  test('rejects duplicate IDs and occupied voxels without mutation', () => {
    const existing = makePiece('same', xLine, { x: 0, y: 0, z: 0 });
    const state = createTetracubeState([existing]);
    const before = JSON.stringify(state);
    expect(
      canPlaceTetracube(state, makePiece('same', xLine, { x: 4, y: 0, z: 0 }))
    ).toBe(false);
    expect(
      canPlaceTetracube(state, makePiece('other', xLine, { x: 3, y: 0, z: 0 }))
    ).toBe(false);
    expect(
      placeTetracube(state, makePiece('other', xLine, { x: 3, y: 0, z: 0 }))
    ).toEqual({
      state,
      placedPiece: null,
      accepted: false,
    });
    expect(JSON.stringify(state)).toBe(before);
  });

  test('rejects absent or malformed state containers', () => {
    const piece = makePiece('valid', xLine, { x: 0, y: 0, z: 0 });
    expect(canPlaceTetracube(null, piece)).toBe(false);
    expect(canPlaceTetracube({}, piece)).toBe(false);
  });

  test('rejects an invalid existing state rather than placing into it', () => {
    const state = { pieces: [{ id: 'broken' }] };
    expect(
      canPlaceTetracube(state, makePiece('new', xLine, { x: 0, y: 0, z: 0 }))
    ).toBe(false);
  });

  test('places successfully when a caller omits undo history', () => {
    const result = placeTetracube(
      { pieces: [] },
      makePiece('without-history', xLine, { x: 0, y: 0, z: 1 })
    );
    expect(result.accepted).toBe(true);
    expect(result.state.undoStack).toHaveLength(1);
  });

  test('places the dropped piece and records a reversible snapshot', () => {
    const state = createTetracubeState();
    const candidate = makePiece('piece-1', xLine, { x: 0, y: 0, z: 3 });
    const result = placeTetracube(state, candidate);
    expect(result.accepted).toBe(true);
    expect(result.placedPiece.position.z).toBe(0);
    expect(result.state.pieces).toEqual([result.placedPiece]);
    expect(undoTetracube(result.state)).toEqual(state);
  });
});

describe('Tetracube deletion and cascading settlement', () => {
  test('deletion triggers immediate cascades without overlap and preserves IDs', () => {
    const bottom = makePiece('bottom', zLine, { x: 0, y: 0, z: 0 });
    const middle = makePiece('middle', zLine, { x: 0, y: 0, z: 4 });
    const top = makePiece('top', zLine, { x: 0, y: 0, z: 8 });
    const state = createTetracubeState([bottom, middle, top]);
    const result = deleteTetracube(state, 'bottom');
    expect(result.removedPiece).toEqual(bottom);
    expect(result.state.pieces).toEqual([
      { ...middle, position: { x: 0, y: 0, z: 0 } },
      { ...top, position: { x: 0, y: 0, z: 4 } },
    ]);
    expect(hasOverlap(result.state.pieces)).toBe(false);
    expect(undoTetracube(result.state)).toEqual(state);
  });

  test('settles equal-height disjoint pieces deterministically and tolerates omitted history', () => {
    const first = makePiece('first', xLine, { x: 0, y: 0, z: 4 });
    const second = makePiece('second', xLine, { x: 5, y: 0, z: 4 });
    const removed = makePiece('removed', xLine, { x: 10, y: 0, z: 0 });
    const result = deleteTetracube(
      { pieces: [second, first, removed] },
      'removed'
    );
    expect(result.state.pieces).toEqual([
      { ...first, position: { x: 0, y: 0, z: 0 } },
      { ...second, position: { x: 5, y: 0, z: 0 } },
    ]);
  });

  test('deleting an absent piece is a no-op', () => {
    const state = createTetracubeState([
      makePiece('base', xLine, { x: 0, y: 0, z: 0 }),
    ]);
    expect(deleteTetracube(state, 'absent')).toEqual({
      state,
      removedPiece: null,
    });
  });

  test('settles a remaining piece onto an uneven one-voxel support', () => {
    const support = makePiece('support', zLine, { x: 0, y: 0, z: 0 });
    const bridge = makePiece('bridge', xLine, { x: 0, y: 0, z: 4 });
    const state = createTetracubeState([support, bridge]);
    const result = deleteTetracube(state, 'support');
    expect(result.state.pieces[0].position.z).toBe(0);
    expect(hasOverlap(result.state.pieces)).toBe(false);
  });

  test('undo with no history and no-op state changes preserve the original snapshot', () => {
    const state = createTetracubeState();
    expect(undoTetracube(state)).toBe(state);
    expect(deleteTetracube(state, 'missing').state).toBe(state);
  });
});
