import {
  adjustTetracubePreview,
  createTetracubeWorld,
  getTetracubePreview,
  mineTetracube,
  moveTetracubePlayer,
  placeOfferedTetracube,
  resetTetracubeWorld,
  rotateOfferedTetracube,
  targetTetracubePiece,
  turnTetracubeView,
  undoTetracubeWorld,
} from '../../../../src/core/browser/game/tetracube/world.js';
import {
  getFreeTetracubeShapes,
  getTetracubeOccupiedCells,
  getTetracubeOrientations,
} from '../../../../src/core/browser/game/tetracube/tetracube.js';

describe('Tetracube construction world', () => {
  test('offers a reproducible randomized shape, orientation, and colour', () => {
    const first = createTetracubeWorld(1234);
    const repeat = createTetracubeWorld(1234);
    expect(first.offered).toEqual(repeat.offered);
    expect(createTetracubeWorld(1235).offered).not.toEqual(first.offered);
    expect(getFreeTetracubeShapes().map(shape => shape.id)).toContain(
      first.offered.shapeId
    );
    expect(
      getTetracubeOrientations(first.offered.shapeId).map(item => item.id)
    ).toContain(first.offered.orientation);
    expect(first.offered.color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(createTetracubeWorld(0).seed).toBeGreaterThan(0);
    expect(createTetracubeWorld(-1).seed).toBe(0xffffffff);
    expect(createTetracubeWorld(1.5).seed).toBe(createTetracubeWorld().seed);
  });

  test('ghost preview follows the player and shows its lowest stable position', () => {
    const world = createTetracubeWorld(8);
    const preview = getTetracubePreview(world);
    expect(preview.valid).toBe(true);
    expect(preview.landedPiece.position.z).toBe(0);
    const moved = moveTetracubePlayer(world, [1, 0, 0, 0.1]);
    expect(getTetracubePreview(moved).candidate.position).not.toEqual(
      preview.candidate.position
    );
  });

  test('movement safely defaults omitted axes and time to zero', () => {
    const world = createTetracubeWorld();
    expect(moveTetracubePlayer(world)).toEqual(world);
    expect(
      moveTetracubePlayer(world, [undefined, undefined, undefined])
    ).toEqual(world);
  });

  test('walking and vertical flight pass through a placed structure', () => {
    const world = createTetracubeWorld(8);
    const { state: placed } = placeOfferedTetracube(world);
    const piece = placed.construction.pieces[0];
    const cell = getTetracubeOccupiedCells(piece)[0];
    const inside = {
      ...placed,
      player: {
        ...placed.player,
        x: cell.x + 0.5,
        y: cell.y + 0.5,
        z: cell.z + 0.5,
        yaw: 0,
      },
    };
    const moved = moveTetracubePlayer(inside, [1, 1, 1, 0.1]);
    expect(moved.player.x).not.toBe(inside.player.x);
    expect(moved.player.y).not.toBe(inside.player.y);
    expect(moved.player.z).not.toBe(inside.player.z);
  });

  test('view pitch is clamped while yaw stays continuous', () => {
    const world = createTetracubeWorld();
    expect(
      turnTetracubeView(world, { yaw: 4, pitch: 10 }).player
    ).toMatchObject({
      yaw: world.player.yaw + 4,
      pitch: 1.35,
    });
    expect(turnTetracubeView(world, { pitch: -10 }).player.pitch).toBe(-1.35);
    expect(turnTetracubeView(world).player).toEqual(world.player);
  });

  test('preview grid offsets and distance remain bounded', () => {
    const world = createTetracubeWorld();
    expect(adjustTetracubePreview(world)).toEqual(world);
    const shifted = adjustTetracubePreview(world, { x: -2, y: 3, distance: 2 });
    expect(shifted.previewOffset).toEqual({ x: -2, y: 3 });
    expect(shifted.previewDistance).toBe(7);
    expect(
      adjustTetracubePreview(world, { distance: -99 }).previewDistance
    ).toBe(2);
    expect(
      adjustTetracubePreview(world, { distance: 99 }).previewDistance
    ).toBe(14);
  });

  test('explicit rotations change only the offered world-axis orientation', () => {
    const world = createTetracubeWorld(12);
    const rotated = rotateOfferedTetracube(world, 'x');
    expect(rotated.offered.orientation).not.toBe(world.offered.orientation);
    expect(rotateOfferedTetracube(rotated, 'x', 3).offered.orientation).toBe(
      world.offered.orientation
    );
    expect(rotateOfferedTetracube(world, 'invalid')).toBe(world);
  });

  test('rejects an unavailable preview without changing construction', () => {
    const world = {
      ...createTetracubeWorld(),
      offered: { id: 'bad', shapeId: 'missing', orientation: 'missing' },
      construction: { pieces: [{ id: 'broken' }], undoStack: [] },
    };
    expect(getTetracubePreview(world).valid).toBe(false);
    const result = placeOfferedTetracube(world);
    expect(result.accepted).toBe(false);
    expect(result.state.construction).toBe(world.construction);
    expect(result.state.message).toContain('blocked');
  });

  test('places at the exact preview and draws the next seeded piece', () => {
    const world = createTetracubeWorld(77);
    const preview = getTetracubePreview(world);
    const placed = placeOfferedTetracube(world);
    expect(placed.accepted).toBe(true);
    expect(placed.placedPiece).toEqual(preview.landedPiece);
    expect(placed.state.construction.pieces).toEqual([preview.landedPiece]);
    expect(placed.state.offered.id).toBe('piece-2');
    expect(placed.state.offered).not.toEqual(world.offered);
  });

  test('mining deletes without refund and world undo restores the piece offer', () => {
    const first = createTetracubeWorld(999);
    const placed = placeOfferedTetracube(first);
    const pieceId = placed.placedPiece.id;
    const mined = mineTetracube(placed.state, pieceId);
    expect(mined.deleted).toBe(true);
    expect(mined.state.construction.pieces).toEqual([]);
    expect(mined.state.offered).toEqual(placed.state.offered);
    const undone = undoTetracubeWorld(mined.state);
    expect(undone.construction.pieces).toEqual(
      placed.state.construction.pieces
    );
    expect(undone.offered).toEqual(placed.state.offered);
    expect(mineTetracube(first, 'missing').deleted).toBe(false);
    expect(undoTetracubeWorld(first).message).toBe(
      'There is nothing to undo yet.'
    );
  });

  test('targets the nearest piece on the view ray', () => {
    const shape = getFreeTetracubeShapes()[0];
    const orientation = getTetracubeOrientations(shape.id).find(item =>
      item.cells.every(cell => cell.y === 0 && cell.z === 0)
    );
    const world = {
      ...createTetracubeWorld(),
      player: { x: 0, y: -5, z: 1.5, yaw: Math.PI / 2, pitch: 0 },
      construction: {
        pieces: [
          {
            id: 'aimed',
            shapeId: shape.id,
            orientation: orientation.id,
            position: { x: -2, y: 0, z: 1 },
          },
          {
            id: 'behind',
            shapeId: shape.id,
            orientation: orientation.id,
            position: { x: -2, y: 5, z: 1 },
          },
        ],
        undoStack: [],
      },
    };
    expect(targetTetracubePiece(world)).toBe('aimed');
    expect(
      targetTetracubePiece({
        ...world,
        construction: { pieces: [{ id: 'bad' }], undoStack: [] },
      })
    ).toBeNull();
    expect(
      targetTetracubePiece({
        ...world,
        player: { ...world.player, x: 100 },
      })
    ).toBeNull();
    expect(targetTetracubePiece(createTetracubeWorld())).toBeNull();
  });

  test('reset restores the original offer and cleared world', () => {
    const world = createTetracubeWorld(55);
    const used = placeOfferedTetracube(world).state;
    expect(resetTetracubeWorld(used)).toEqual(world);
  });
});
