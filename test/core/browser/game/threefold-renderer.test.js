import { createBrokenGateScene } from '../../../../src/core/browser/game/threefold/gatehouse.js';
import { renderThreefoldFrame } from '../../../../src/core/browser/game/threefold/renderer.js';
import { createScaleState } from '../../../../src/core/browser/game/threefold/spatial.js';
import { createThreefoldSimulation } from '../../../../src/core/browser/game/threefold/simulation.js';

const THRESHOLDS = {
  urgentAtMinutes: 4,
  surgeAtMinutes: 9,
  aftermathAtMinutes: 15,
};

describe('THREEFOLD Mosslight handheld frame', () => {
  test('uses the shared pixelated 160x144 frame and exposes current status', () => {
    const state = createThreefoldSimulation(THRESHOLDS);
    const frame = renderThreefoldFrame(state);

    expect(frame).toMatchObject({
      type: 'threefold',
      width: 160,
      height: 144,
      pixelated: true,
      quest: 'The Broken Gate',
      threefold: {
        scale: 0,
        heightMeters: 1.8288,
        anchor: 8,
        maximumAnchor: 8,
        crisisStage: 'rising',
        elapsedMinutes: 0,
      },
    });
    expect(frame.dialogue).toMatchObject({
      actorId: 'dock-worker',
      lines: [{ text: 'The tide is climbing. That gate will not hold.' }],
      index: 0,
    });
    expect(frame.toast).toBe(
      'INVESTIGATE THE FAILING GATE. DECIDE HOW TO RESPOND.'
    );
    expect(frame.presentation.status).toContain('SCALE 0 · A 8/8 · RISING');
    expect(frame.shapes.some(shape => shape.actorId === 'mara')).toBe(true);
  });

  test('keeps Mara fixed while the same geometry scales inversely by three', () => {
    const humanScale = renderThreefoldFrame(
      createThreefoldSimulation(THRESHOLDS)
    );
    const scene = createBrokenGateScene();
    scene.spawn = createScaleState(scene.spawn.position, {
      scale: -1,
      anchor: 8,
      maximumAnchor: 8,
      minimumUnlockedScale: -2,
      maximumUnlockedScale: 1,
    });
    const smallerScale = renderThreefoldFrame(
      createThreefoldSimulation(THRESHOLDS, scene)
    );
    const avatarBounds = frameBounds(humanScale.shapes, 'actorId', 'mara');
    const smallerAvatarBounds = frameBounds(
      smallerScale.shapes,
      'actorId',
      'mara'
    );
    const wall = humanScale.shapes.find(
      shape => shape.geometryId === 'gatehouse-west-wall'
    );
    const smallerWall = smallerScale.shapes.find(
      shape => shape.geometryId === 'gatehouse-west-wall'
    );

    expect(smallerAvatarBounds).toEqual(avatarBounds);
    expect((smallerWall?.width ?? 0) / (wall?.width ?? 0)).toBeCloseTo(3);
    expect((smallerWall?.height ?? 0) / (wall?.height ?? 0)).toBeCloseTo(3);
  });

  test('omits geometry already destroyed by growth and shows the updated tide stage', () => {
    const initial = createThreefoldSimulation(THRESHOLDS);
    const grown = {
      ...initial,
      player: {
        ...initial.player,
        scale: 1,
        destroyedGeometryIds: ['gatehouse-west-wall'],
      },
      crisis: {
        ...initial.crisis,
        elapsedMinutes: 9,
        stage: 'surge',
      },
    };
    const frame = renderThreefoldFrame(grown);

    expect(frame.world.map.objects.map(object => object.id)).not.toContain(
      'gatehouse-west-wall'
    );
    expect(frame.threefold).toMatchObject({ scale: 1, crisisStage: 'surge' });
    expect(frame.dialogue).toBeNull();
    expect(frame.presentation.status).toContain('SURGE');
    expect(frame.toast).toContain('SURGE');
  });
});

/**
 * Measure the rendered bounds of a tagged actor or piece of geometry.
 * @param {Array<Record<string, any>>} shapes Rendered Mosslight-compatible pixel shapes.
 * @param {'actorId'|'geometryId'} property Metadata selector.
 * @param {string} id Actor or geometry identifier.
 * @returns {{x: number, y: number, width: number, height: number}|null} Tight shape bounds.
 */
function frameBounds(shapes, property, id) {
  const owned = shapes.filter(shape => shape[property] === id);
  if (owned.length === 0) return null;
  const minX = Math.min(...owned.map(shape => shape.x));
  const minY = Math.min(...owned.map(shape => shape.y));
  const maxX = Math.max(...owned.map(shape => shape.x + shape.width));
  const maxY = Math.max(...owned.map(shape => shape.y + shape.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
