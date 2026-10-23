import { createThreefoldRuntime } from '../../../../src/core/browser/game/threefold/runtime.js';
import { createBrokenGateScene } from '../../../../src/core/browser/game/threefold/gatehouse.js';
import { createThreefoldSluiceScene } from '../../../../src/core/browser/game/threefold/sluice-scene.js';

describe('THREEFOLD in-game travel', () => {
  test('restores each region save when returning through the travel control', () => {
    const runtime = createThreefoldRuntime(new Map());
    const gateStart = runtime.getState();

    runtime.dispatch({ type: 'move', direction: 'right' });
    const gateAfterMove = runtime.getState();
    expect(gateAfterMove.player.position).not.toEqual(
      gateStart.player.position
    );

    runtime.travelTo(createThreefoldSluiceScene());
    expect(runtime.getState().scene.id).toBe('small-world-sluice');
    runtime.dispatch({ type: 'move', direction: 'right' });
    const sluiceAfterMove = runtime.getState();

    runtime.travelTo(createBrokenGateScene());
    expect(runtime.getState().scene.id).toBe('broken-gate');
    expect(runtime.getState().player.position).toEqual(
      gateAfterMove.player.position
    );

    runtime.travelTo(createThreefoldSluiceScene());
    expect(runtime.getState().scene.id).toBe('small-world-sluice');
    expect(runtime.getState().player.position).toEqual(
      sluiceAfterMove.player.position
    );

    const currentFrame = runtime.frame();
    expect(runtime.travelTo(createThreefoldSluiceScene())).toEqual(
      currentFrame
    );
  });
});
