import { jest } from '@jest/globals';
import { createThreefoldMenuRuntime } from '../../../../src/core/browser/game/threefold/page.js';

test('Y menu exposes Weftways discoveries and outcomes in the handheld view', () => {
  const runtime = createRuntime({
    threadboundRelayRecord: {
      title: 'Relay ledger',
      text: 'Downstream replies stopped after the bypass.',
    },
    threadboundPellOutcome: {
      title: 'Pell outcome',
      text: 'Pell waits for root damage to be assessed.',
    },
    threadboundRelayDisclosure: {
      title: 'Shared ledger',
      text: 'Mara shares the relay copy.',
    },
    threadboundRelayConcealment: {
      title: 'Private ledger',
      text: 'Mara keeps the relay copy private.',
    },
    threadboundRelayDestruction: {
      title: 'Destroyed ledger',
      text: 'Mara destroys the relay copy.',
    },
    threadboundRelayRestitution: {
      title: 'Repair offer',
      text: 'Mara offers replacement relay tokens.',
    },
    threadboundIndependentPublication: {
      title: 'Public relay notice',
      text: 'Pell posts a separate caravan notice.',
    },
  });
  const menu = createThreefoldMenuRuntime(runtime, {
    querySelector: () => ({ click: jest.fn() }),
  });
  press(menu, 'y');
  press(menu, 'down');
  press(menu, 'down');
  press(menu, 'down');
  press(menu, 'a');

  const visibleText = new Set();
  for (let index = 0; index < 30; index += 1) {
    menu
      .frame()
      .shapes.filter(shape => shape.type === 'text')
      .forEach(shape =>
        visibleText.add(shape.text.replace(/^>\s*/, '').trim())
      );
    press(menu, 'down');
  }
  const fieldNotes = [...visibleText].join(' ').toUpperCase();

  expect(fieldNotes).toContain('RELAY LEDGER');
  expect(fieldNotes).toContain('PELL OUTCOME');
  expect(fieldNotes).toContain('SHARED LEDGER');
  expect(fieldNotes).toContain('PRIVATE LEDGER');
  expect(fieldNotes).toContain('DESTROYED LEDGER');
  expect(fieldNotes).toContain('REPAIR OFFER');
  expect(fieldNotes).toContain('PUBLIC RELAY NOTICE');
});

test('destroyed relay copy stays hidden while its outcome remains in field notes', () => {
  const runtime = createRuntime({
    threadboundRelayRecord: null,
    threadboundRelayDestruction: {
      title: 'Destroyed ledger',
      text: 'Mara destroys the relay copy.',
    },
  });
  const menu = createThreefoldMenuRuntime(runtime, {
    querySelector: () => ({ click: jest.fn() }),
  });
  press(menu, 'y');
  press(menu, 'down');
  press(menu, 'down');
  press(menu, 'down');
  press(menu, 'a');
  const visibleText = new Set();
  for (let index = 0; index < 10; index += 1) {
    menu
      .frame()
      .shapes.filter(shape => shape.type === 'text')
      .forEach(shape =>
        visibleText.add(shape.text.replace(/^>\s*/, '').trim())
      );
    press(menu, 'down');
  }

  expect([...visibleText].join(' ')).toContain('DESTROYED LEDGER');
  expect([...visibleText].join(' ')).not.toContain('RELAY LEDGER');
});

/**
 * Create a small runtime containing field-note data for menu presentation.
 * @param {Record<string, any>} threefold Route discoveries and outcomes.
 * @returns {Record<string, any>} Stub runtime consumed by the menu facade.
 */
function createRuntime(threefold) {
  return {
    pause: jest.fn(),
    resume: jest.fn(),
    isRunning: () => true,
    step: jest.fn(),
    travelTo: jest.fn(),
    frame: () => ({
      shapes: [],
      world: { map: { name: 'THE WEFTWAYS' } },
      threefold: {
        witnessLedger: [],
        testimony: { accounts: [] },
        campaignPlaces: [],
        campaignPressure: [],
        campaignClock: { elapsedGameSeconds: 0 },
        ...threefold,
      },
    }),
  };
}

/**
 * Press and release one controller action.
 * @param {ReturnType<typeof createThreefoldMenuRuntime>} menu In-game menu.
 * @param {string} action Controller input.
 * @returns {void} Advances one press and release.
 */
function press(menu, action) {
  menu.step(16, [action]);
  menu.step(16, []);
}
