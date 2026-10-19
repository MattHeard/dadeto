import { createBrokenGateScene } from '../../../../src/core/browser/game/threefold/gatehouse.js';
import { renderThreefoldFrame } from '../../../../src/core/browser/game/threefold/renderer.js';
import { createScaleState } from '../../../../src/core/browser/game/threefold/spatial.js';
import {
  createThreefoldSimulation,
  stepThreefoldSimulation,
} from '../../../../src/core/browser/game/threefold/simulation.js';

const THRESHOLDS = {
  urgentAtMinutes: 4,
  surgeAtMinutes: 9,
  aftermathAtMinutes: 15,
};

/**
 *
 * @param episode
 */
/**
 * Create a settled withdrawal with optional prior episode outcomes.
 * @param {{passengers?: 'aboard'|'evacuated'|'lost', ferry?: 'afloat'|'lost', latchfolk?: 'unwarned'|'warned'|'safe'|'lost'}} [episode] Prior outcomes to preserve.
 * @returns {ReturnType<typeof createThreefoldSimulation>} Withdrawn simulation.
 */
function createWithdrawnSimulation(episode = {}) {
  const scene = createBrokenGateScene();
  const road = scene.interactables.find(item => item.id === 'upland-road-exit');
  scene.spawn = createScaleState(road.position);
  const initial = createThreefoldSimulation(THRESHOLDS, scene);
  return stepThreefoldSimulation(
    { ...initial, episode: { ...initial.episode, ...episode } },
    { type: 'interact' }
  );
}

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
    expect(frame.threefold.tideProgress).toBe(0);
    expect(frame.shapes).toContainEqual(
      expect.objectContaining({
        type: 'rect',
        x: 126,
        y: 8,
        width: 26,
        height: 4,
        fill: '#315744',
      })
    );
    expect(frame.shapes).toContainEqual(
      expect.objectContaining({
        type: 'rect',
        x: 126,
        y: 8,
        width: 0,
        height: 4,
        fill: '#bfd77c',
      })
    );
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
    expect(frame.threefold.tideProgress).toBe(0.6);
    expect(frame.shapes).toContainEqual(
      expect.objectContaining({
        type: 'rect',
        x: 126,
        y: 8,
        width: 16,
        height: 4,
        fill: '#e16b5a',
      })
    );
  });

  test('shows the lower-channel warning, then renders the flooded settlement', () => {
    const initial = createThreefoldSimulation(THRESHOLDS);
    const atRisk = {
      ...initial,
      player: {
        ...initial.player,
        destroyedGeometryIds: ['relief-gate'],
      },
      crisis: {
        ...initial.crisis,
        elapsedMinutes: 4,
        stage: 'urgent',
      },
    };

    const warning = renderThreefoldFrame(atRisk);
    expect(warning.threefold).toMatchObject({
      gateState: 'forced-open',
      drainageState: 'at-risk',
    });
    expect(warning.toast).toContain('LOWER CHANNEL AT RISK');
    expect(warning.world.map.objects.map(object => object.id)).not.toContain(
      'drainage-floodwater'
    );

    const surge = {
      ...atRisk,
      crisis: { ...atRisk.crisis, elapsedMinutes: 9, stage: 'surge' },
    };
    const flooded = renderThreefoldFrame(surge);

    expect(flooded.threefold.drainageState).toBe('flooded');
    expect(flooded.toast).toContain('LOWER CHANNEL FLOODED');
    expect(flooded.world.map.objects.map(object => object.id)).toContain(
      'drainage-floodwater'
    );
    expect(flooded.shapes).toContainEqual(
      expect.objectContaining({
        geometryId: 'drainage-floodwater',
        fill: '#25a9b8',
      })
    );
  });

  test('shows the repaired gate and receding lower water after ferry loss', () => {
    const initial = createThreefoldSimulation(THRESHOLDS);
    const repaired = {
      ...initial,
      player: {
        ...initial.player,
        scale: -2,
        destroyedGeometryIds: ['gatehouse-west-wall'],
      },
      crisis: { ...initial.crisis, elapsedMinutes: 9, stage: 'surge' },
      episode: {
        ...initial.episode,
        passengers: 'lost',
        ferry: 'lost',
        latchfolk: 'lost',
        gateRepaired: true,
      },
    };
    const flooded = renderThreefoldFrame(repaired);

    expect(flooded.threefold).toMatchObject({
      gateState: 'repaired',
      drainageState: 'flooded',
      gateRepaired: true,
    });
    expect(flooded.toast).toContain('LOWER CHANNEL STILL FLOODED');
    expect(flooded.world.map.objects.map(object => object.id)).toContain(
      'relief-gate'
    );
    expect(flooded.world.map.objects.map(object => object.id)).toContain(
      'relief-gate-locking-pawl'
    );
    expect(flooded.world.map.objects.map(object => object.id)).toContain(
      'drainage-floodwater'
    );

    const aftermath = renderThreefoldFrame({
      ...repaired,
      crisis: { ...repaired.crisis, elapsedMinutes: 15, stage: 'aftermath' },
    });
    expect(aftermath.threefold.drainageState).toBe('receded');
    expect(aftermath.toast).toContain('LOWER WATER RECEDED');
    expect(aftermath.world.map.objects.map(object => object.id)).not.toContain(
      'drainage-floodwater'
    );
  });

  test('renders the ferry mooring and branch-specific rescue outcomes', () => {
    const scene = createBrokenGateScene();
    scene.spawn = createScaleState(scene.interactables[0].position);
    const initial = createThreefoldSimulation(THRESHOLDS, scene);
    const rescued = stepThreefoldSimulation(initial, { type: 'interact' });
    const frame = renderThreefoldFrame(rescued);

    expect(frame.world.map.objects.map(object => object.id)).toContain(
      'ferry-mooring-line'
    );
    expect(frame.shapes).toContainEqual(
      expect.objectContaining({ geometryId: 'ferry-mooring-line' })
    );
    expect(frame.threefold).toMatchObject({
      passengers: 'evacuated',
      ferry: 'afloat',
    });
    expect(frame.toast).toContain('PASSENGERS EVACUATED');

    const surge = stepThreefoldSimulation(rescued, {
      type: 'wait',
      elapsedGameMinutes: 9,
    });
    expect(renderThreefoldFrame(surge).toast).toContain(
      'PASSENGERS SAFE · FERRY LOST'
    );
  });

  test('renders the Latchfolk warning target and branch outcome', () => {
    const scene = createBrokenGateScene();
    const watchkeeper = scene.interactables.find(
      item => item.id === 'latchfolk-watchkeeper'
    );
    scene.spawn = createScaleState(watchkeeper.position);
    const initial = createThreefoldSimulation(THRESHOLDS, scene);
    const warned = stepThreefoldSimulation(initial, { type: 'interact' });
    const frame = renderThreefoldFrame(warned);

    expect(frame.world.map.objects.map(object => object.id)).toContain(
      'latchfolk-watchkeeper'
    );
    expect(frame.shapes).toContainEqual(
      expect.objectContaining({
        geometryId: 'latchfolk-watchkeeper',
        fill: '#b6d8dc',
      })
    );
    expect(frame.threefold.latchfolk).toBe('warned');
    expect(frame.toast).toContain('LATCHFOLK WARNED');

    const surge = stepThreefoldSimulation(warned, {
      type: 'wait',
      elapsedGameMinutes: 9,
    });
    const outcome = renderThreefoldFrame(surge);
    expect(outcome.threefold.latchfolk).toBe('safe');
    expect(outcome.toast).toContain('LATCHFOLK SAFE');
  });

  test('renders the upland road and persistent withdrawal outcome', () => {
    const withdrawn = createWithdrawnSimulation();
    const frame = renderThreefoldFrame(withdrawn);

    expect(frame.world.map.objects.map(object => object.id)).toContain(
      'upland-road-exit'
    );
    expect(frame.shapes).toContainEqual(
      expect.objectContaining({
        geometryId: 'upland-road-exit',
        fill: '#f1ead0',
      })
    );
    expect(frame.threefold).toMatchObject({
      withdrawn: true,
      crisisStage: 'aftermath',
      passengers: 'lost',
      ferry: 'lost',
      latchfolk: 'lost',
    });
    expect(frame.toast).toContain('MARA WITHDREW');
    expect(frame.toast).toContain('PASSENGERS LOST');
    expect(frame.toast).toContain('LATCHFOLK LOST');
  });

  test('renders rescued passengers and warned Latchfolk as safe after withdrawal', () => {
    const withdrawn = createWithdrawnSimulation({
      passengers: 'evacuated',
      latchfolk: 'warned',
    });
    const frame = renderThreefoldFrame(withdrawn);

    expect(frame.toast).toBe(
      'MARA WITHDREW · PASSENGERS SAFE · LATCHFOLK SAFE'
    );
  });

  test.each([
    [4, 'urgent', 7, '#e9d88d'],
    [15, 'aftermath', 26, '#e16b5a'],
  ])(
    'shows %s crisis progress in the tide meter',
    (minutes, stage, width, fill) => {
      const state = createThreefoldSimulation(THRESHOLDS);
      state.crisis.elapsedMinutes = minutes;
      state.crisis.stage = stage;

      const frame = renderThreefoldFrame(state);

      expect(frame.threefold.tideProgress).toBe(minutes / 15);
      expect(frame.shapes).toContainEqual(
        expect.objectContaining({
          type: 'rect',
          x: 126,
          y: 8,
          width,
          height: 4,
          fill,
        })
      );
    }
  );
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
