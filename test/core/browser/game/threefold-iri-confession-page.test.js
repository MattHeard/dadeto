import { jest } from '@jest/globals';
import { createThreefoldMenuRuntime } from '../../../../src/core/browser/game/threefold/page.js';

test('Y menu exposes Iri confession in field notes inside the game', () => {
  const record = {
    title: "Iri's recorded confession",
    text: 'Iri suspected the downstream danger and concealed the uncertainty.',
  };
  const runtime = {
    pause: jest.fn(),
    resume: jest.fn(),
    isRunning: () => true,
    step: jest.fn(),
    travelTo: jest.fn(),
    frame: () => ({
      shapes: [],
      world: { map: { name: 'THE BROKEN GATE' } },
      threefold: {
        witnessLedger: [],
        testimony: { accounts: [] },
        iriRecordedConfession: record,
        campaignPlaces: [],
        campaignPressure: [],
        campaignClock: { elapsedGameSeconds: 0 },
      },
    }),
  };
  const menu = createThreefoldMenuRuntime(runtime, {
    querySelector: () => ({ click: jest.fn() }),
  });
  press(menu, 'y');
  press(menu, 'down');
  press(menu, 'down');
  press(menu, 'down');
  press(menu, 'a');

  const text = menu
    .frame()
    .shapes.filter(shape => shape.type === 'text')
    .map(shape => shape.text);
  expect(text).toContain('JOURNAL');
  const renderedText = text.join(' ').replace(/\s+/g, ' ');
  expect(renderedText).toContain(record.title.toUpperCase());
  expect(renderedText).toContain(record.text.toUpperCase());
});

test('field notes show the empty state when the selected region has no record', () => {
  const menu = createThreefoldMenuRuntime(
    {
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
        },
      }),
    },
    { querySelector: () => ({ click: jest.fn() }) }
  );
  press(menu, 'y');
  press(menu, 'down');
  press(menu, 'down');
  press(menu, 'down');
  press(menu, 'a');

  const text = menu
    .frame()
    .shapes.filter(shape => shape.type === 'text')
    .map(shape => shape.text);
  expect(text).toContain('> NO FIELD NOTES YET');
});

/**
 * Send one controller action and release it for the following frame.
 * @param {ReturnType<typeof createThreefoldMenuRuntime>} menu In-game menu.
 * @param {string} action Requested button.
 * @returns {void} Advances both press and release frames.
 */
function press(menu, action) {
  menu.step(16, [action]);
  menu.step(16, []);
}
