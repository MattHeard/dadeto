import { renderThreefoldFrame } from '../../../../src/core/browser/game/threefold/renderer.js';
import { createThreefoldSimulation } from '../../../../src/core/browser/game/threefold/simulation.js';

const THRESHOLDS = {
  urgentAtMinutes: 4,
  surgeAtMinutes: 9,
  aftermathAtMinutes: 15,
};

describe('THREEFOLD early gate repair frame', () => {
  test('shows the in-progress repair without completed-crisis outcomes', () => {
    const initial = createThreefoldSimulation(THRESHOLDS);
    const repaired = {
      ...initial,
      crisis: { ...initial.crisis, elapsedMinutes: 4, stage: 'urgent' },
      episode: {
        ...initial.episode,
        gateRepaired: true,
        gateRepairedBeforeSurge: true,
      },
    };
    const frame = renderThreefoldFrame(repaired);

    expect(frame.toast).toBe('GATE REPAIRED BEFORE SURGE · LOWER CHANNEL HELD');
  });

  test('shows the repaired gate holding the channel through surge and retains losses', () => {
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
        gateRepairedBeforeSurge: true,
      },
    };
    const frame = renderThreefoldFrame(repaired);

    expect(frame.threefold).toMatchObject({
      gateState: 'repaired',
      drainageState: 'dry',
      gateRepaired: true,
      gateRepairedBeforeSurge: true,
    });
    expect(frame.toast).toContain('GATE REPAIRED BEFORE SURGE');
    expect(frame.toast).toContain('PASSENGERS LOST');
    expect(frame.toast).toContain('LATCHFOLK LOST');
    expect(frame.world.map.objects.map(object => object.id)).not.toContain(
      'drainage-floodwater'
    );
  });

  test('adds the aftermath closure prompt after an early repair', () => {
    const initial = createThreefoldSimulation(THRESHOLDS);
    const repaired = {
      ...initial,
      player: {
        ...initial.player,
        destroyedGeometryIds: ['gatehouse-west-wall'],
      },
      crisis: { ...initial.crisis, elapsedMinutes: 15, stage: 'aftermath' },
      episode: {
        ...initial.episode,
        passengers: 'lost',
        ferry: 'lost',
        latchfolk: 'lost',
        gateRepaired: true,
        gateRepairedBeforeSurge: true,
      },
    };
    const frame = renderThreefoldFrame(repaired);

    expect(frame.toast).toContain('GATE REPAIRED BEFORE SURGE');
    expect(frame.toast).toContain('PASSENGERS LOST');
    expect(frame.toast).toContain('LATCHFOLK LOST');
    expect(frame.toast).toContain('SHRINK TO -2 TO REPORT OR DEPART UPLAND');
  });
});
