import { jest } from '@jest/globals';
import { drawTetracubeFrame } from '../../../../src/core/browser/game/tetracube/renderer.js';
import {
  createTetracubeWorld,
  placeOfferedTetracube,
} from '../../../../src/core/browser/game/tetracube/world.js';

/**
 * Create a recording canvas context for renderer tests.
 * @returns {object} Canvas-compatible test double.
 */
function createContext() {
  const gradient = { addColorStop: jest.fn() };
  return {
    beginPath: jest.fn(),
    closePath: jest.fn(),
    createLinearGradient: jest.fn(() => gradient),
    fill: jest.fn(),
    fillRect: jest.fn(),
    lineTo: jest.fn(),
    moveTo: jest.fn(),
    stroke: jest.fn(),
    set fillStyle(_value) {},
    set strokeStyle(_value) {},
    set lineWidth(_value) {},
  };
}

describe('Tetracube perspective renderer', () => {
  test('draws the open ground, reticle, and translucent offered piece', () => {
    const context = createContext();
    drawTetracubeFrame(context, createTetracubeWorld(22), 800, 450);
    expect(context.createLinearGradient).toHaveBeenCalledWith(0, 0, 0, 450);
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 800, 450);
    expect(context.stroke).toHaveBeenCalled();
    expect(context.fill).toHaveBeenCalled();
  });

  test('draws placed construction pieces and their visible faces', () => {
    const context = createContext();
    const world = placeOfferedTetracube(createTetracubeWorld(23)).state;
    drawTetracubeFrame(context, world, 600, 400);
    expect(context.fill).toHaveBeenCalled();
    expect(context.stroke).toHaveBeenCalled();
  });

  test('clips a piece that crosses behind the camera plane', () => {
    const context = createContext();
    const base = createTetracubeWorld(32);
    const shape = {
      id: 'tetracube-1',
      cells: [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: 2, y: 0, z: 0 },
        { x: 3, y: 0, z: 0 },
      ],
    };
    const orientation = shape.cells
      .map(cell => [cell.x, cell.y, cell.z].join(','))
      .join(';');
    const world = {
      ...base,
      construction: {
        pieces: [
          {
            id: 'near-camera',
            shapeId: shape.id,
            orientation,
            color: '#8bcf82',
            position: { x: -1, y: -5, z: 2 },
          },
        ],
        undoStack: [],
      },
    };
    drawTetracubeFrame(context, world, 600, 400);
    expect(context.fillRect).toHaveBeenCalledTimes(1);
  });

  test('uses a fallback colour for legacy placed pieces', () => {
    const context = createContext();
    const world = placeOfferedTetracube(createTetracubeWorld(31)).state;
    world.construction.pieces[0].color = '';
    drawTetracubeFrame(context, world, 600, 400);
    expect(context.fill).toHaveBeenCalled();
  });

  test('ignores malformed placed pieces while drawing the construction', () => {
    const context = createContext();
    const world = {
      ...createTetracubeWorld(33),
      construction: {
        pieces: [{ id: 'broken-piece', position: { x: 0, y: 0, z: 0 } }],
        undoStack: [],
      },
    };
    drawTetracubeFrame(context, world, 320, 240);
    expect(context.fillRect).toHaveBeenCalledTimes(1);
  });

  test('skips cube faces behind the camera without failing', () => {
    const context = createContext();
    const world = {
      ...createTetracubeWorld(24),
      player: { x: 0, y: 2, z: 1, yaw: 0, pitch: 0 },
    };
    drawTetracubeFrame(context, world, 320, 240);
    expect(context.fillRect).toHaveBeenCalledTimes(1);
  });

  test('handles an unavailable ghost without drawing a preview piece', () => {
    const context = createContext();
    const world = {
      ...createTetracubeWorld(25),
      offered: { id: 'bad', shapeId: 'missing', orientation: 'missing' },
    };
    drawTetracubeFrame(context, world, 320, 240);
    expect(context.fillRect).toHaveBeenCalledTimes(1);
  });
});
