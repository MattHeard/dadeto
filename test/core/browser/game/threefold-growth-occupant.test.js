import { createBrokenGateScene } from '../../../../src/core/browser/game/threefold/gatehouse.js';
import { THREEFOLD_LATCHFOLK_INTERACTABLE_ID } from '../../../../src/core/browser/game/threefold/episode.js';
import { renderThreefoldFrame } from '../../../../src/core/browser/game/threefold/renderer.js';
import {
  createThreefoldSimulation,
  previewThreefoldGrowthDamageIds,
  previewThreefoldGrowthEffects,
  stepThreefoldSimulation,
} from '../../../../src/core/browser/game/threefold/simulation.js';
import { createScaleState } from '../../../../src/core/browser/game/threefold/spatial.js';
import {
  restoreThreefoldSimulation,
  serializeThreefoldSimulation,
} from '../../../../src/core/browser/game/threefold/save.js';

const THRESHOLDS = {
  urgentAtMinutes: 4,
  surgeAtMinutes: 9,
  aftermathAtMinutes: 15,
};

/**
 * Create a game state next to the authored watchkeeper.
 * @param {{x: number, y: number}} [position] Mara position in canonical metres.
 * @param {'unwarned'|'warned'|'safe'|'lost'} [latchfolk] Watchkeeper outcome.
 * @param {number} [scale] Mara scale rung.
 * @returns {ReturnType<typeof createThreefoldSimulation>} Test simulation.
 */
function createWatchkeeperGrowthState(
  position = { x: 6.7, y: 7.25 },
  latchfolk = 'unwarned',
  scale = 0
) {
  const scene = createBrokenGateScene();
  scene.spawn = createScaleState(position, {
    scale,
    anchor: 8,
    maximumAnchor: 8,
    minimumUnlockedScale: -2,
    maximumUnlockedScale: 1,
  });
  const state = createThreefoldSimulation(THRESHOLDS, scene);
  return latchfolk === 'unwarned'
    ? state
    : { ...state, episode: { ...state.episode, latchfolk } };
}

/**
 * Create a growth state whose expansion intersects two adjacent living beings.
 * @returns {ReturnType<typeof createThreefoldSimulation>} Test simulation.
 */
function createAdjacentLivingGrowthState() {
  const state = createWatchkeeperGrowthState(
    { x: 3.226, y: 4 },
    'unwarned',
    -2
  );
  const watchkeeper = state.scene.interactables.find(
    ({ id }) => id === THREEFOLD_LATCHFOLK_INTERACTABLE_ID
  );
  if (!watchkeeper) throw new Error('The authored watchkeeper is missing.');
  watchkeeper.position = { x: 3.01, y: 4 };
  watchkeeper.bounds = {
    min: { x: 2.84, y: 3.77, z: 0 },
    max: { x: 3.18, y: 4.23, z: 0.55 },
  };
  return state;
}

describe('THREEFOLD growth impact on the known watchkeeper', () => {
  test('keeps the geometry-only preview aligned with the combined growth effects', () => {
    const state = createThreefoldSimulation(THRESHOLDS);
    const effects = previewThreefoldGrowthEffects(state);

    expect(effects.geometryIds).toContain('gatehouse-west-wall');
    expect(previewThreefoldGrowthDamageIds(state)).toEqual(effects.geometryIds);
  });

  test('previews the lethal overlap read-only and commits the same fate', () => {
    const state = createWatchkeeperGrowthState();
    const before = JSON.parse(JSON.stringify(state));

    expect(previewThreefoldGrowthEffects(state)).toEqual({
      geometryIds: [],
      occupantIds: [THREEFOLD_LATCHFOLK_INTERACTABLE_ID],
      creatureIds: [],
    });
    expect(state).toEqual(before);

    const grown = stepThreefoldSimulation(state, { type: 'grow' });

    expect(grown.player.scale).toBe(1);
    expect(grown.episode.latchfolk).toBe('lost');
    expect(previewThreefoldGrowthEffects(grown).occupantIds).toEqual([]);
  });

  test('kills the watchkeeper when Mara grows after entering their bounds at scale -2', () => {
    const outside = createWatchkeeperGrowthState(
      { x: 7.025, y: 7.25 },
      'unwarned',
      -2
    );
    const inside = Array.from({ length: 10 }).reduce(
      state =>
        stepThreefoldSimulation(state, { type: 'move', direction: 'right' }),
      outside
    );

    expect(inside.player.scale).toBe(-2);
    expect(inside.player.position.x).toBeGreaterThan(7.08);
    expect(inside.player.position.x).toBeLessThan(7.42);
    expect(previewThreefoldGrowthEffects(inside).occupantIds).toEqual([
      THREEFOLD_LATCHFOLK_INTERACTABLE_ID,
    ]);
    expect(renderThreefoldFrame(inside).shapes).toContainEqual(
      expect.objectContaining({ type: 'text', text: 'A KILLS LATCHFOLK' })
    );

    const grown = stepThreefoldSimulation(inside, { type: 'grow' });
    const restored = restoreThreefoldSimulation(
      serializeThreefoldSimulation(grown)
    );

    expect(grown.player.scale).toBe(-1);
    expect(grown.episode.latchfolk).toBe('lost');
    expect(restored.episode.latchfolk).toBe('lost');
  });

  test.each([
    [
      'outside the next growth volume',
      createWatchkeeperGrowthState({ x: 6.4, y: 7.25 }),
    ],
    ['already evacuated', createWatchkeeperGrowthState(undefined, 'safe')],
    ['already lost', createWatchkeeperGrowthState(undefined, 'lost')],
  ])('does not preview a watchkeeper %s', (_condition, state) => {
    expect(previewThreefoldGrowthEffects(state).occupantIds).toEqual([]);
  });

  test('does not preview a living occupant when the next growth rung is locked', () => {
    const state = createWatchkeeperGrowthState(
      { x: 7.25, y: 7.25 },
      'unwarned',
      1
    );

    expect(previewThreefoldGrowthEffects(state).occupantIds).toEqual([]);
  });

  test('keeps a warned watchkeeper vulnerable until the crisis resolves', () => {
    const state = createWatchkeeperGrowthState(undefined, 'warned');

    expect(previewThreefoldGrowthEffects(state).occupantIds).toEqual([
      THREEFOLD_LATCHFOLK_INTERACTABLE_ID,
    ]);
  });

  test('highlights the watchkeeper and leaves A mapped to growth', () => {
    const frame = renderThreefoldFrame(createWatchkeeperGrowthState());

    expect(frame.threefold.growthPreviewOccupantIds).toEqual([
      THREEFOLD_LATCHFOLK_INTERACTABLE_ID,
    ]);
    expect(frame.shapes).toContainEqual(
      expect.objectContaining({
        geometryId: THREEFOLD_LATCHFOLK_INTERACTABLE_ID,
        fill: '#e16b5a',
        growthPreview: true,
      })
    );
    expect(frame.shapes).toContainEqual(
      expect.objectContaining({ type: 'text', text: 'A KILLS LATCHFOLK' })
    );
    expect(frame.quickAction).toBe('grow');
  });

  test('preserves the growth-caused outcome through save and restore', () => {
    const grown = stepThreefoldSimulation(createWatchkeeperGrowthState(), {
      type: 'grow',
    });
    const restored = restoreThreefoldSimulation(
      serializeThreefoldSimulation(grown)
    );

    expect(restored.episode.latchfolk).toBe('lost');
    expect(previewThreefoldGrowthEffects(restored).occupantIds).toEqual([]);
  });

  test('previews the rat and adjacent watchkeeper in the same growth footprint', () => {
    const state = createAdjacentLivingGrowthState();
    const before = JSON.parse(JSON.stringify(state));

    expect(previewThreefoldGrowthEffects(state)).toEqual({
      geometryIds: [],
      occupantIds: [THREEFOLD_LATCHFOLK_INTERACTABLE_ID],
      creatureIds: ['gatehouse-rat'],
    });
    expect(state).toEqual(before);
    expect(renderThreefoldFrame(state).shapes).toContainEqual(
      expect.objectContaining({ type: 'text', text: 'A KILLS LATCHFOLK' })
    );
    expect(renderThreefoldFrame(state).shapes).toContainEqual(
      expect.objectContaining({ type: 'text', text: 'A KILLS RAT' })
    );
  });

  test('commits and restores both fates from one growth action', () => {
    const grown = stepThreefoldSimulation(createAdjacentLivingGrowthState(), {
      type: 'grow',
    });
    const restored = restoreThreefoldSimulation(
      serializeThreefoldSimulation(grown)
    );

    expect(grown.player.scale).toBe(-1);
    expect(grown.episode.latchfolk).toBe('lost');
    expect(grown.encounter).toEqual({
      ratFate: 'killed',
      ratAction: 'growth',
    });
    expect(restored?.episode.latchfolk).toBe('lost');
    expect(restored?.encounter).toEqual(grown.encounter);
  });
});
