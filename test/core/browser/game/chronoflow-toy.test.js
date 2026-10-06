import { describe, expect, it } from '@jest/globals';
import { chronoflowToy } from '../../../../src/core/browser/game/chronoflow/chronoflowToy.js';
import {
  advanceChronoflow,
  createChronoflowGame,
  openSluice,
  setChronoflowRoute,
  toggleChronoflowChannel,
} from '../../../../src/core/browser/game/chronoflow/runtime.js';
import { ARCHIVE_ENTRY_SOLUTION } from '../../../../src/core/browser/game/chronoflow/witness.js';

/**
 * Create a toy environment whose permanent-data adapter keeps saves between calls.
 * @returns {{data: Record<string, any>, press: (key: string, type?: string) => any}} Shared toy harness.
 */
function createToyHarness() {
  const data = {};
  const env = new Map([
    ['setLocalPermanentData', update => Object.assign(data, update) && data],
  ]);
  return {
    data,
    press: (key, type = 'keydown') =>
      JSON.parse(chronoflowToy(JSON.stringify({ type, key }), env)),
  };
}

describe('Chronoflow embedded toy', () => {
  it('renders a Canvas 2D board with the same solver state as page commands', () => {
    const payload = JSON.parse(
      chronoflowToy(JSON.stringify({ commands: ARCHIVE_ENTRY_SOLUTION }))
    );
    let pageGame = createChronoflowGame();
    pageGame = setChronoflowRoute(pageGame, 'archive');
    pageGame = toggleChronoflowChannel(pageGame, 11);
    pageGame = openSluice(pageGame);
    for (let batch = 0; batch < 5; batch += 1) {
      pageGame = advanceChronoflow(pageGame, 60);
    }

    expect(payload).toMatchObject({
      width: 160,
      height: 144,
      pixelated: true,
      snapshot: {
        route: 'archive',
        gateOpen: true,
        completed: true,
        mode: 'practice',
        timedCredit: false,
      },
    });
    expect(payload.snapshot.fluid).toEqual(pageGame.fluid);
    expect(payload.shapes[0]).toMatchObject({
      type: 'rect',
      width: 160,
      height: 144,
      fill: '#182f36',
    });
    expect(payload.shapes.some(shape => shape.fill === '#246774')).toBe(true);
    expect(
      payload.shapes.some(
        shape =>
          typeof shape.text === 'string' && shape.text.includes('ARROWS MOVE')
      )
    ).toBe(true);
  });

  it('persists Mosslight keypad actions as untimed handheld progress', () => {
    const { data, press } = createToyHarness();

    const initial = press('ArrowRight');
    expect(initial.snapshot.selectedCell).toBe(8);
    expect(initial.snapshot.mode).toBe('practice');
    expect(initial.snapshot.timedCredit).toBe(false);
    expect(data.CHRO1.selectedCell).toBe(8);

    const released = press('a', 'keyup');
    expect(released.snapshot.editsUsed).toBe(0);
    expect(released.snapshot.selectedCell).toBe(8);

    press('ArrowLeft');
    press('ArrowDown');
    press('ArrowLeft');
    const edited = press('a');
    expect(edited.snapshot.editsUsed).toBe(1);
    expect(edited.snapshot.selectedCell).toBe(11);
    expect(edited.snapshot.fluid.solids[11]).toBe(false);

    const routed = press('b');
    expect(routed.snapshot.route).toBe('archive');
    expect(press('b').snapshot.route).toBe('drain');
    expect(press('b').snapshot.route).toBe('archive');
    const opened = press('x');
    expect(opened.snapshot.gateOpen).toBe(true);
    const advanced = press('y');
    expect(advanced.snapshot.fluid.tick).toBeGreaterThan(0);
    expect(advanced.snapshot.mode).toBe('practice');
    expect(advanced.snapshot.timedCredit).toBe(false);

    const reset = press('r');
    expect(reset.snapshot.fluid.tick).toBe(0);
    expect(reset.snapshot.selectedCell).toBe(7);
    expect(reset.snapshot.editsUsed).toBe(0);
  });

  it('normalizes invalid saved cursors and clamps movement at board edges', () => {
    const { data, press } = createToyHarness();
    press('?');
    for (const invalidCell of [-1, 20, '7']) {
      data.CHRO1.selectedCell = invalidCell;
      expect(press('?').snapshot.selectedCell).toBe(7);
    }

    data.CHRO1.selectedCell = 0;
    expect(press('ArrowUp').snapshot.selectedCell).toBe(0);
    expect(press('ArrowLeft').snapshot.selectedCell).toBe(0);
    expect(press('ArrowDown').snapshot.selectedCell).toBe(5);
    expect(press('ArrowUp').snapshot.selectedCell).toBe(0);
    expect(press('ArrowRight').snapshot.selectedCell).toBe(1);

    data.CHRO1 = { game: {}, selectedCell: -1 };
    expect(press('ArrowLeft').snapshot.selectedCell).toBe(6);
    const circularGame = {};
    circularGame.fluid = circularGame;
    data.CHRO1 = { game: circularGame, selectedCell: 10 };
    expect(press('?').snapshot.selectedCell).toBe(7);
  });

  it('makes A advance water only on a non-editable cell after opening the gate', () => {
    const { press } = createToyHarness();
    press('ArrowDown');
    expect(press('a').snapshot.editsUsed).toBe(0);
    press('b');
    press('x');
    expect(press('a').snapshot.fluid.tick).toBeGreaterThan(0);
  });

  it('returns fresh untimed practice for malformed input and commands', () => {
    const malformedJson = JSON.parse(chronoflowToy('{'));
    const emptyInput = JSON.parse(chronoflowToy(''));
    const malformedCommands = JSON.parse(
      chronoflowToy(
        JSON.stringify({
          commands: [{ type: 'advance', steps: 1, batches: 11 }],
        })
      )
    );

    expect(malformedJson.snapshot).toMatchObject({
      route: 'drain',
      gateOpen: false,
      mode: 'practice',
      timedCredit: false,
    });
    expect(emptyInput.snapshot).toEqual(malformedJson.snapshot);
    expect(malformedCommands.snapshot.fluid.tick).toBe(0);
    expect(malformedCommands.snapshot).toEqual(malformedJson.snapshot);
    expect(JSON.parse(chronoflowToy('{}')).snapshot).toEqual(
      malformedJson.snapshot
    );
  });
});
