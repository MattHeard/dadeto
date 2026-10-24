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

test('opens the empty field notes from the main menu using only the controls', () => {
  const { menu } = createMenuRuntime();
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

test('opens the campaign status from the main menu using only the controls', () => {
  const { menu } = createMenuRuntime();
  press(menu, 'y');
  for (let index = 0; index < 4; index += 1) press(menu, 'down');
  press(menu, 'a');

  const text = menu
    .frame()
    .shapes.filter(shape => shape.type === 'text')
    .map(shape => shape.text);
  expect(text).toContain('CAMPAIGN');
  expect(text).toContain('> CLOCK 0 MIN');
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
});
