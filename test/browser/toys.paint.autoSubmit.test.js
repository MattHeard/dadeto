/* @jest-environment jsdom */
import { expect, jest, test } from '@jest/globals';
import { createToysHandle } from '../../src/core/browser/toys.js';
import { paint } from '../../src/core/browser/toys/2026-11-14/paint.js';

/**
 * Send a touch pointer sample through the real canvas event listeners.
 * @param {HTMLCanvasElement} canvas Drawing surface.
 * @param {string} type Pointer event type.
 * @param {number} x Horizontal coordinate.
 */
function touch(canvas, type, x) {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, {
    pointerType: 'touch',
    pointerId: 1,
    button: 0,
    clientX: x,
    clientY: 40,
  });
  canvas.dispatchEvent(event);
}

test('Auto frames preserve touch strokes, tool selections and full screen', () => {
  const context = Object.fromEntries(
    ['beginPath', 'moveTo', 'lineTo', 'stroke', 'clearRect'].map(key => [
      key,
      jest.fn(),
    ])
  );
  jest
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue(context);
  const frames = [];
  const dom = {
    createElement: tag => document.createElement(tag),
    appendChild: (parent, child) => parent.appendChild(child),
    querySelector: (parent, selector) => parent.querySelector(selector),
    removeAllChildren: parent => parent.replaceChildren(),
    getValue: input => input.value,
    requestAnimationFrame: callback => frames.push(callback),
    addWarning: jest.fn(),
  };
  const parent = document.createElement('div');
  document.body.appendChild(parent);
  const elements = {
    inputElement: document.createElement('textarea'),
    outputParentElement: parent,
    outputSelect: { value: 'paint' },
    article: { id: 'PAIN1' },
  };
  const env = { dom, createEnv: () => new Map(), errorFn: jest.fn() };
  createToysHandle().createRegisterAutoSubmitPolling(
    elements,
    paint,
    env
  )({
    frameId: null,
    lastValue: null,
  });
  frames.shift()();
  const panel = parent.firstElementChild;
  const canvas = parent.querySelector('canvas');
  canvas.setPointerCapture = jest.fn();
  canvas.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 600,
    height: 400,
  });
  const color = parent.querySelector('[type=color]');
  color.value = '#ff0000';
  parent.querySelector('[type=range]').value = '24';
  touch(canvas, 'pointerdown', 20);
  frames.shift()();
  expect(parent.firstElementChild).toBe(panel);
  expect(parent.querySelector('canvas')).toBe(canvas);
  expect(canvas.isConnected).toBe(true);
  touch(parent.querySelector('canvas'), 'pointermove', 60);
  expect(context.lineTo).toHaveBeenLastCalledWith(120.001, 80);
  expect(context.strokeStyle).toBe('#ff0000');
  expect(context.lineWidth).toBe(24);
  const fullscreen = panel.querySelectorAll('button')[1];
  fullscreen.click();
  frames.shift()();
  expect(parent.firstElementChild).toBe(panel);
  expect(panel.style.position).toBe('fixed');
  expect(context.clearRect).not.toHaveBeenCalled();
  fullscreen.click();
  expect(panel.style.position).toBe('');
  expect(env.errorFn).not.toHaveBeenCalled();
  parent.remove();
});
