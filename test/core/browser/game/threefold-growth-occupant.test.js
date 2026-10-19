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
 * @returns {ReturnType<typeof createThreefoldSimulation>} Test simulation.
 */
function createWatchkeeperGrowthState(
  position = { x: 6.7, y: 7.25 },
  latchfolk = 'unwarned'
) {
  const scene = createBrokenGateScene();
  scene.spawn = createScaleState(position, {
    scale: 0,
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
    });
    expect(state).toEqual(before);

    const grown = stepThreefoldSimulation(state, { type: 'grow' });

    expect(grown.player.scale).toBe(1);
    expect(grown.episode.latchfolk).toBe('lost');
    expect(previewThreefoldGrowthEffects(grown).occupantIds).toEqual([]);
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
});
