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
      width: 320,
      height: 270,
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
      width: 320,
      height: 270,
      fill: '#071a26',
    });
    expect(payload.shapes.some(shape => shape.fill === '#25b9d2')).toBe(true);
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
