import { jest } from '@jest/globals';
import { startTetracubePage } from '../../../../src/core/browser/game/tetracube/page.js';
import { createTetracubeWorld } from '../../../../src/core/browser/game/tetracube/world.js';

/**
 * Create a recording canvas context for page lifecycle tests.
 * @returns {object} Canvas-compatible test double.
 */
const makeContext = () => {
  const gradient = { addColorStop: jest.fn() };
  return {
    beginPath: jest.fn(),
    closePath: jest.fn(),
    createLinearGradient: jest.fn(() => gradient),
    fill: jest.fn(),
    fillRect: jest.fn(),
    lineTo: jest.fn(),
    moveTo: jest.fn(),
    stroke: jest.fn(),
    set fillStyle(_value) {},
    set strokeStyle(_value) {},
    set lineWidth(_value) {},
  };
};

/**
 *
 */
/**
 * Build a browser page with recording DOM and canvas dependencies.
 * @returns {object} Page elements, listeners, and injected environment.
 */
function makePageHarness() {
  const listeners = new Map();
  const context = makeContext();
  const canvas = {
    width: 0,
    height: 0,
    getContext: jest.fn(() => context),
    getBoundingClientRect: () => ({ width: 800, height: 450 }),
    addEventListener: (name, handler) =>
      listeners.set(`canvas:${name}`, handler),
    removeEventListener: name => listeners.delete(`canvas:${name}`),
    setPointerCapture: jest.fn(),
    focus: jest.fn(),
  };
  const status = { textContent: '' };
  const pieceReadout = { textContent: '' };
  const structureReadout = { textContent: '' };
  const buttons = [
    'place',
    'mine',
    'undo',
    'reset',
    'rotate-x-right',
    'move-forward',
    'move-unknown',
    'target-left',
    'target-unknown',
    'target-farther',
    'unknown',
  ].map(action => ({
    dataset: { action },
    addEventListener: (name, handler) =>
      listeners.set(`button:${action}:${name}`, handler),
    removeEventListener: name => listeners.delete(`button:${action}:${name}`),
  }));
  const documentObj = {
    querySelector: selector =>
      ({
        '#tetracube-world': canvas,
        '#tetracube-status': status,
        '#piece-readout': pieceReadout,
        '#structure-readout': structureReadout,
      })[selector] || null,
    querySelectorAll: () => buttons,
    addEventListener: (name, handler) =>
      listeners.set(`document:${name}`, handler),
    removeEventListener: name => listeners.delete(`document:${name}`),
  };
  const windowObj = {
    devicePixelRatio: 1,
    addEventListener: (name, handler) =>
      listeners.set(`window:${name}`, handler),
    removeEventListener: name => listeners.delete(`window:${name}`),
  };
  const requestFrame = jest.fn(callback => {
    listeners.set('frame', callback);
    return 1;
  });
  const cancelFrame = jest.fn();
  return {
    listeners,
    context,
    canvas,
    status,
    pieceReadout,
    structureReadout,
    buttons,
    documentObj,
    windowObj,
    requestFrame,
    cancelFrame,
    environment: { documentObj, windowObj, requestFrame, cancelFrame },
  };
}

const keyEvent = key => ({
  key,
  repeat: false,
  preventDefault: jest.fn(),
});

describe('Tetracube standalone page', () => {
  test('does nothing when required page elements are absent', () => {
    const documentObj = {
      querySelector: () => null,
      querySelectorAll: () => [],
    };
    expect(
      startTetracubePage({
        documentObj,
        windowObj: { addEventListener: jest.fn() },
        requestFrame: jest.fn(),
        cancelFrame: jest.fn(),
      })
    ).toEqual(expect.any(Function));
  });

  test('reports an unavailable 2D canvas context', () => {
    const harness = makePageHarness();
    harness.canvas.getContext.mockReturnValue(null);
    startTetracubePage(harness.environment);
    expect(harness.status.textContent).toContain('unavailable');
    expect(harness.requestFrame).not.toHaveBeenCalled();
  });

  test('starts with an offer and renders the world to the responsive canvas', () => {
    const harness = makePageHarness();
    harness.windowObj.devicePixelRatio = 3;
    const dispose = startTetracubePage(harness.environment);
    expect(harness.pieceReadout.textContent).toContain('tetracube-');
    expect(harness.structureReadout.textContent).toBe(
      '0 placed · preview clear'
    );
    expect(harness.canvas.width).toBe(1600);
    expect(harness.canvas.height).toBe(900);
    expect(harness.context.fillRect).toHaveBeenCalled();
    expect(harness.requestFrame).toHaveBeenCalledTimes(1);
    dispose();
  });

  test('defaults to one pixel per CSS pixel without a device ratio', () => {
    const harness = makePageHarness();
    harness.windowObj.devicePixelRatio = undefined;
    const dispose = startTetracubePage(harness.environment);
    expect(harness.canvas.width).toBe(800);
    expect(harness.canvas.height).toBe(450);
    dispose();
  });

  test('shows a blocked landing preview from injected starting state', () => {
    const harness = makePageHarness();
    harness.environment.initialWorld = {
      ...createTetracubeWorld(),
      offered: { id: 'broken', shapeId: 'missing', orientation: 'missing' },
    };
    const dispose = startTetracubePage(harness.environment);
    expect(harness.structureReadout.textContent).toContain('preview blocked');
    dispose();
  });

  test('keyboard place and undo update the construction count', () => {
    const harness = makePageHarness();
    const dispose = startTetracubePage(harness.environment);
    const keydown = harness.listeners.get('canvas:keydown');
    keydown(keyEvent('Enter'));
    expect(harness.structureReadout.textContent).toContain('1 placed');
    expect(harness.status.textContent).toContain('placed');
    keydown(keyEvent('z'));
    expect(harness.structureReadout.textContent).toContain('0 placed');
    keydown(keyEvent('f'));
    keydown({ ...keyEvent('r'), repeat: true });
    keydown(keyEvent('unmapped'));
    expect(harness.status.textContent).toBe('Undone.');
    dispose();
  });

  test('held navigation, arrow turning, and pointer drag remain responsive', () => {
    const harness = makePageHarness();
    const dispose = startTetracubePage(harness.environment);
    const keydown = harness.listeners.get('canvas:keydown');
    const keyup = harness.listeners.get('canvas:keyup');
    const held = keyEvent('w');
    keydown(held);
    expect(held.preventDefault).toHaveBeenCalled();
    const frame = harness.listeners.get('frame');
    frame(100);
    keyup({ key: 'w' });
    const strafe = keyEvent('d');
    keydown(strafe);
    frame(200);
    keyup({ key: 'd' });
    const fly = keyEvent('e');
    keydown(fly);
    frame(300);
    keyup({ key: 'e' });
    const turn = keyEvent('ArrowRight');
    keydown(turn);
    frame(400);
    keyup({ key: 'ArrowRight' });
    const pointerDown = harness.listeners.get('canvas:pointerdown');
    const pointerMove = harness.listeners.get('canvas:pointermove');
    pointerMove({ clientX: 10, clientY: 5 });
    pointerDown({ clientX: 20, clientY: 20, pointerId: 4 });
    pointerMove({ clientX: 10, clientY: 5 });
    pointerMove({ clientX: 40, clientY: 5 });
    harness.listeners.get('canvas:pointerup')();
    const contextMenu = { preventDefault: jest.fn() };
    harness.listeners.get('canvas:contextmenu')(contextMenu);
    expect(contextMenu.preventDefault).toHaveBeenCalled();
    harness.listeners.get('window:blur')();
    expect(harness.canvas.setPointerCapture).toHaveBeenCalledWith(4);
    expect(harness.canvas.focus).toHaveBeenCalled();
    dispose();
  });

  test('touch buttons place, mine, rotate, reset, and update status', () => {
    const harness = makePageHarness();
    const dispose = startTetracubePage(harness.environment);
    const click = action =>
      harness.listeners.get(`button:${action}:click`)({
        currentTarget: { dataset: { action } },
      });
    click('mine');
    click('place');
    expect(harness.structureReadout.textContent).toContain('1 placed');
    click('mine');
    expect(harness.structureReadout.textContent).toContain('0 placed');
    click('rotate-x-right');
    click('move-forward');
    click('move-unknown');
    click('target-left');
    click('target-farther');
    click('target-unknown');
    click('unknown');
    click('reset');
    expect(harness.structureReadout.textContent).toContain('0 placed');
    expect(harness.status.textContent).toContain('Explore');
    harness.listeners.get('button:unknown:click')({
      currentTarget: { dataset: {} },
    });
    dispose();
  });

  test('removes all registered listeners and cancels the active frame', () => {
    const harness = makePageHarness();
    const dispose = startTetracubePage(harness.environment);
    const stoppedFrame = harness.listeners.get('frame');
    dispose();
    stoppedFrame(250);
    expect(harness.cancelFrame).toHaveBeenCalledWith(1);
    expect(harness.listeners.has('canvas:keydown')).toBe(false);
    expect(harness.listeners.has('window:blur')).toBe(false);
    expect(harness.listeners.has('button:place:click')).toBe(false);
  });
});
