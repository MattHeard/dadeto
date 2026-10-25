import { jest } from '@jest/globals';
import { createThreefoldMenuRuntime } from '../../../../src/core/browser/game/threefold/page.js';

/**
 * Create the menu facade and spies for standalone interaction tests.
 * @returns {{menu: ReturnType<typeof createThreefoldMenuRuntime>, runtime: object, buttons: Map<string, {click: jest.Mock}>}} Menu test handles.
 */
function createMenuRuntime() {
  let running = true;
  const buttons = new Map();
  const runtime = {
    start: jest.fn(),
    step: jest.fn(),
    pause: jest.fn(() => {
      running = false;
    }),
    resume: jest.fn(() => {
      running = true;
    }),
    isRunning: jest.fn(() => running),
    travelTo: jest.fn(),
    frame: jest.fn(() => ({
      shapes: [],
      world: { map: { name: 'THE BROKEN GATE' } },
      threefold: {
        witnessLedger: [],
        campaignPlaces: [],
        campaignPressure: [],
        campaignClock: { elapsedGameSeconds: 0 },
      },
    })),
  };
  const documentObj = {
    querySelector: selector => {
      if (!buttons.has(selector)) buttons.set(selector, { click: jest.fn() });
      return buttons.get(selector);
    },
  };
  return {
    menu: createThreefoldMenuRuntime(runtime, documentObj),
    runtime,
    buttons,
  };
}

/**
 * Press one or more controller actions for a frame, then release them.
 * @param {ReturnType<typeof createThreefoldMenuRuntime>} menu Menu runtime.
 * @param {string[]} actions Controller actions.
 * @returns {void} Advances and releases the requested actions.
 */
function press(menu, ...actions) {
  menu.step(16, actions);
  menu.step(16, []);
}

test('resumes play when A selects the main menu resume item', () => {
  const { menu, runtime } = createMenuRuntime();
  press(menu, 'y');

  expect(menu.isRunning()).toBe(true);
  expect(runtime.pause).toHaveBeenCalledTimes(1);

  press(menu, 'a');

  expect(runtime.resume).toHaveBeenCalledTimes(1);
  expect(menu.frame().shapes.some(shape => shape.text === 'THREEFOLD')).toBe(
    false
  );
  expect(menu.isRunning()).toBe(true);
});

test('uses B and X to return and B or Y to close the menu', () => {
  const { menu, runtime } = createMenuRuntime();
  press(menu, 'y');
  press(menu, 'down');
  press(menu, 'a');
  press(menu, 'b');
  expect(menu.frame().shapes.some(shape => shape.text === 'THREEFOLD')).toBe(
    true
  );

  press(menu, 'down');
  press(menu, 'a');
  press(menu, 'x');
  expect(menu.frame().shapes.some(shape => shape.text === 'THREEFOLD')).toBe(
    true
  );

  press(menu, 'b');
  expect(menu.frame().shapes.some(shape => shape.text === 'THREEFOLD')).toBe(
    false
  );
  expect(runtime.resume).toHaveBeenCalledTimes(1);

  press(menu, 'y');
  press(menu, 'y');
  expect(menu.frame().shapes.some(shape => shape.text === 'THREEFOLD')).toBe(
    false
  );
  expect(runtime.resume).toHaveBeenCalledTimes(2);
});

test('opens the empty field notes from the main menu using only the controls', () => {
  const { menu, runtime } = createMenuRuntime();
  runtime.frame.mockReturnValue({
    shapes: [],
    world: { map: { name: 'THE BROKEN GATE' } },
  });
  press(menu, 'y');
  for (let index = 0; index < 3; index += 1) press(menu, 'down');
  press(menu, 'a');

  const text = menu
    .frame()
    .shapes.filter(shape => shape.type === 'text')
    .map(shape => shape.text);
  expect(text).toContain('JOURNAL');
  expect(text).toContain('> NO FIELD NOTES YET');
});

test('uses the default guide objective when the frame has no world name', () => {
  const { menu, runtime } = createMenuRuntime();
  runtime.frame.mockReturnValue({ shapes: [] });
  press(menu, 'y');
  press(menu, 'down');
  press(menu, 'a');

  const text = menu
    .frame()
    .shapes.filter(shape => shape.type === 'text')
    .map(shape => shape.text);
  expect(text).toContain('GUIDE');
  expect(text.some(line => line.includes('REACH THE WEST'))).toBe(true);
  expect(text).toContain('A SELECT · B BACK · Y CLOSE');
});

test('omits blank rows for an empty saved witness entry', () => {
  const { menu, runtime } = createMenuRuntime();
  runtime.frame.mockReturnValue({
    shapes: [],
    world: { map: { name: 'THE BROKEN GATE' } },
    threefold: {
      witnessLedger: [
        {
          title: '',
          intention: '',
          knowledge: '',
          consequence: '',
        },
      ],
      campaignPlaces: [],
      campaignPressure: [],
      campaignClock: { elapsedGameSeconds: 0 },
    },
  });
  press(menu, 'y');
  for (let index = 0; index < 3; index += 1) press(menu, 'down');
  press(menu, 'a');

  const text = menu
    .frame()
    .shapes.filter(shape => shape.type === 'text')
    .map(shape => shape.text);
  expect(text).toContain('JOURNAL');
  expect(text).toContain('> BACK');
  expect(text).not.toContain('> NO FIELD NOTES YET');
  expect(text.filter(line => line.startsWith('  '))).toHaveLength(0);
});

test('shows saved witness facts in the in-game field notes', () => {
  const { menu, runtime } = createMenuRuntime();
  runtime.frame.mockReturnValue({
    shapes: [],
    world: { map: { name: 'THE BROKEN GATE' } },
    threefold: {
      witnessLedger: [
        {
          title: 'CHOICE · 4.25 GAME MINUTES',
          intention:
            'Increase Mara scale by one rung. Intended outcome: lift the gate.',
          knowledge: 'Known then: Gate was intact.',
          consequence: 'Observed: The gate is now forced open.',
          relation: null,
        },
        {
          title: 'OBSERVATION · 9 GAME MINUTES',
          intention: 'Wait for the surge.',
          knowledge: 'Known then: Tide rising.',
          consequence: 'Observed: Lower channel flooded.',
          relation: 'Linked to witness-1.',
        },
      ],
      campaignPlaces: [],
      campaignPressure: [],
      campaignClock: { elapsedGameSeconds: 0 },
    },
  });
  press(menu, 'y');
  for (let index = 0; index < 3; index += 1) press(menu, 'down');
  press(menu, 'a');

  const text = menu
    .frame()
    .shapes.filter(shape => shape.type === 'text')
    .map(shape => shape.text);
  expect(text).toContain('JOURNAL');
  expect(text).toContain('> CHOICE · 4.25 GAME');
  expect(text).toContain('  INCREASE MARA');
  expect(text).toContain('  KNOWN THEN: GATE');
  expect(text).toContain('  OBSERVED: THE GATE');
});

test('shows attributed testimony and unresolved responsibility in field notes', () => {
  const { menu, runtime } = createMenuRuntime();
  runtime.frame.mockReturnValue({
    shapes: [],
    world: { map: { name: 'THE BROKEN GATE' } },
    threefold: {
      witnessLedger: [],
      testimony: {
        accounts: [
          {
            speaker: 'Dock worker',
            statement: 'I warned that the tide was rising.',
          },
        ],
        responsibility: {
          question: 'Who knew the gate would fail?',
          status: 'unresolved',
        },
      },
      campaignPlaces: [],
      campaignPressure: [],
      campaignClock: { elapsedGameSeconds: 0 },
    },
  });
  press(menu, 'y');
  for (let index = 0; index < 3; index += 1) press(menu, 'down');
  press(menu, 'a');

  const text = menu
    .frame()
    .shapes.filter(shape => shape.type === 'text')
    .map(shape => shape.text);
  expect(text).toContain('JOURNAL');
  expect(text.some(line => line.includes('DOCK WORKER: I'))).toBe(true);
  expect(text).toContain('  WARNED THAT THE');
  expect(text).toContain('  UNRESOLVED');
});

test('shows saved episode disclosures in the in-game field notes', () => {
  const { menu, runtime } = createMenuRuntime();
  runtime.frame.mockReturnValue({
    shapes: [],
    world: { map: { name: 'THE BROKEN GATE' } },
    threefold: {
      witnessLedger: [],
      iriWitnessLead: {
        title: "The Watchkeeper's relay account",
        text: 'After the surge, the watchkeeper remembers a faint relay call asking for Iri. They cannot say who sent it or whether Iri heard.',
      },
      campaignPlaces: [],
      campaignPressure: [],
      campaignClock: { elapsedGameSeconds: 0 },
    },
  });
  press(menu, 'y');
  for (let index = 0; index < 3; index += 1) press(menu, 'down');
  press(menu, 'a');

  const text = menu
    .frame()
    .shapes.filter(shape => shape.type === 'text')
    .map(shape => shape.text);
  expect(text).toContain('JOURNAL');
  expect(text).toContain("> THE WATCHKEEPER'S");
  expect(text).toContain('  RELAY ACCOUNT:');
  expect(text).toContain('  AFTER THE SURGE,');
});

test('uses fallback text for saved disclosures without title or text', () => {
  const { menu, runtime } = createMenuRuntime();
  runtime.frame.mockReturnValue({
    shapes: [],
    world: { map: { name: 'THE BROKEN GATE' } },
    threefold: {
      witnessLedger: [],
      iriWitnessLead: {
        paragraphs: ['A tide chart survives.', 'Its edge is torn.'],
      },
      ferryWreckSearch: {},
      campaignPlaces: [],
      campaignPressure: [],
      campaignClock: { elapsedGameSeconds: 0 },
    },
  });
  press(menu, 'y');
  for (let index = 0; index < 3; index += 1) press(menu, 'down');
  press(menu, 'a');

  const text = menu
    .frame()
    .shapes.filter(shape => shape.type === 'text')
    .map(shape => shape.text);
  expect(text).toContain('> FIELD NOTE: A TIDE');
  expect(text).toContain('  CHART SURVIVES.');
  expect(text).toContain('  ITS EDGE IS TORN.');
  expect(text.filter(line => line.includes('FIELD NOTE:'))).toHaveLength(2);
});

test('returns from the in-game guide to the main menu with A', () => {
  const { menu } = createMenuRuntime();
  press(menu, 'y');
  press(menu, 'down');
  press(menu, 'a');
  expect(menu.frame().shapes.some(shape => shape.text === 'GUIDE')).toBe(true);

  let backSelected = false;
  for (let index = 0; index < 40; index += 1) {
    if (menu.frame().shapes.some(shape => shape.text === '> BACK')) {
      backSelected = true;
      break;
    }
    press(menu, 'down');
  }
  expect(backSelected).toBe(true);
  press(menu, 'a');

  expect(menu.frame().shapes.some(shape => shape.text === 'GUIDE')).toBe(false);
  expect(menu.frame().shapes.some(shape => shape.text === 'THREEFOLD')).toBe(
    true
  );
});

test('opens the campaign status from the main menu using only the controls', () => {
  const { menu, runtime } = createMenuRuntime();
  runtime.frame.mockReturnValue({
    shapes: [],
    world: { map: { name: 'THE BROKEN GATE' } },
    threefold: {
      witnessLedger: [],
      campaignPlaces: [
        { label: 'EAST QUAY', state: 'FLOODED' },
        { id: 'BROKEN GATE', active: true },
        { id: 'HARBOR ROAD' },
      ],
      campaignPressure: [{ label: 'LOW QUAY', state: 'AT RISK' }],
      campaignClock: { elapsedGameSeconds: 3660 },
      returnTide: { title: 'RETURN TIDE', text: 'Rising water' },
    },
  });
  press(menu, 'y');
  for (let index = 0; index < 4; index += 1) press(menu, 'down');
  press(menu, 'a');

  const text = menu
    .frame()
    .shapes.filter(shape => shape.type === 'text')
    .map(shape => shape.text);
  expect(text).toContain('CAMPAIGN');
  expect(text).toContain('> CLOCK 61 MIN');
  expect(text).toContain('  EAST QUAY: FLOODED');
  expect(text.some(line => line.includes('BROKEN GATE: HE'))).toBe(true);
  expect(text).toContain('  HARBOR ROAD:');
  expect(text).toContain('  VISITED');
  expect(text).toContain('  LOW QUAY: AT RISK');
  expect(text).toContain('  RISING WATER');

  runtime.frame.mockReturnValue({
    shapes: [],
    world: { map: { name: 'THE BROKEN GATE' } },
    threefold: {
      campaignPlaces: null,
      campaignPressure: null,
      campaignClock: null,
      returnTide: null,
    },
  });
  const emptyStatus = menu
    .frame()
    .shapes.filter(shape => shape.type === 'text')
    .map(shape => shape.text);
  expect(emptyStatus).toContain('> CLOCK 0 MIN');
  expect(emptyStatus.some(line => line.includes('RETURN TIDE'))).toBe(false);
});

test('clamps the campaign cursor when saved locations disappear', () => {
  const { menu, runtime } = createMenuRuntime();
  runtime.frame.mockReturnValue({
    shapes: [],
    world: { map: { name: 'THE BROKEN GATE' } },
    threefold: {
      campaignPlaces: Array.from({ length: 8 }, (_, index) => ({
        label: `PLACE ${index}`,
        state: 'VISITED',
      })),
      campaignPressure: [],
      campaignClock: { elapsedGameSeconds: 0 },
    },
  });
  press(menu, 'y');
  for (let index = 0; index < 4; index += 1) press(menu, 'down');
  press(menu, 'a');
  for (let index = 0; index < 8; index += 1) press(menu, 'down');

  runtime.frame.mockReturnValue({
    shapes: [],
    world: { map: { name: 'THE BROKEN GATE' } },
    threefold: {
      campaignPlaces: [],
      campaignPressure: [],
      campaignClock: { elapsedGameSeconds: 0 },
    },
  });

  const text = menu
    .frame()
    .shapes.filter(shape => shape.type === 'text')
    .map(shape => shape.text);
  expect(text).toContain('  CLOCK 0 MIN');
  expect(text).toContain('> BACK');
});

test('runs the in-game system actions and resumes without extra controls', () => {
  const { menu, runtime, buttons } = createMenuRuntime();
  press(menu, 'y');
  for (let index = 0; index < 6; index += 1) press(menu, 'down');
  press(menu, 'a');

  expect(menu.frame().shapes.some(shape => shape.text === 'SYSTEM')).toBe(true);
  press(menu, 'down');
  press(menu, 'a');
  expect(buttons.get('#fullscreen-game').click).toHaveBeenCalledTimes(1);
  press(menu, 'down');
  press(menu, 'a');
  expect(buttons.get('#reset-game').click).toHaveBeenCalledTimes(1);
  press(menu, 'up');
  press(menu, 'up');
  press(menu, 'a');

  expect(runtime.resume).toHaveBeenCalledTimes(1);
  expect(menu.frame().shapes.some(shape => shape.text === 'SYSTEM')).toBe(
    false
  );
});

test('Y opens an in-game guide navigated only with the eight handheld controls', () => {
  const { menu, runtime } = createMenuRuntime();
  press(menu, 'y');
  press(menu, 'down');
  press(menu, 'a');

  const frame = menu.frame();
  const text = frame.shapes
    .filter(shape => shape.type === 'text')
    .map(shape => shape.text);
  expect(text).toContain('GUIDE');
  expect(text).toContain('> ARROWS MOVE');
  expect(text).toContain('  A USE / GROW');
  expect(text).toContain('  B SHRINK');
  expect(text).toContain('  X WAIT / BYPASS');
  expect(runtime.step).not.toHaveBeenCalled();
  expect(menu.isRunning()).toBe(true);
});

test('ignores the legacy extra interaction input', () => {
  const { menu, runtime } = createMenuRuntime();
  press(menu, 'interact');

  expect(runtime.step).toHaveBeenCalledWith(16, []);
});

test('the in-game travel menu preserves region navigation without a page selector', () => {
  const { menu, runtime } = createMenuRuntime();
  press(menu, 'y');
  press(menu, 'down');
  press(menu, 'down');
  press(menu, 'a');
  expect(menu.frame().shapes.some(shape => shape.text === 'TRAVEL')).toBe(true);
  press(menu, 'down');
  press(menu, 'a');
  expect(runtime.travelTo).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'small-world-sluice' })
  );
  expect(menu.isRunning()).toBe(true);
});

test('the in-game saves menu keeps save, transfer, and backup actions available', () => {
  const { menu, buttons } = createMenuRuntime();
  press(menu, 'y');
  for (let i = 0; i < 5; i += 1) press(menu, 'down');
  press(menu, 'a');
  expect(menu.frame().shapes.some(shape => shape.text === 'SAVES')).toBe(true);
  press(menu, 'a');
  expect(buttons.get('#save-game').click).toHaveBeenCalledTimes(1);
  for (let i = 0; i < 5; i += 1) press(menu, 'down');
  press(menu, 'a');
  expect(menu.frame().shapes.some(shape => shape.text === 'SAVES')).toBe(false);
  expect(menu.frame().shapes.some(shape => shape.text === 'THREEFOLD')).toBe(
    true
  );
});
