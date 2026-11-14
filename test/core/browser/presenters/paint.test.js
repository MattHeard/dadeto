/* @jest-environment jsdom */
import { jest, test, expect } from '@jest/globals';
import { paint } from '../../../../src/core/browser/toys/2026-11-14/paint.js';
import { createPaintElement } from '../../../../src/core/browser/presenters/paint.js';

/**
 * Create a panel with a mocked drawing context.
 * @param {object | null} context Mock drawing context.
 * @returns {object} Panel fixture.
 */
function setup(context) {
  jest
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue(context);
  const root = createPaintElement('{}', {
    createElement: tag => document.createElement(tag),
    appendChild: (parent, child) => parent.appendChild(child),
  });
  const canvas = root.querySelector('canvas');
  canvas.setPointerCapture = jest.fn();
  canvas.getBoundingClientRect = () => ({
    left: 10,
    top: 20,
    width: 600,
    height: 400,
  });
  return { root, canvas };
}

/**
 * Dispatch a simulated pointer event.
 * @param {HTMLCanvasElement} canvas Surface.
 * @param {string} type Event type.
 * @param {object} props Pointer overrides.
 */
function pointer(canvas, type, props = {}) {
  const event = new Event(type, { cancelable: true });
  Object.assign(
    event,
    { pointerId: 1, button: 0, clientX: 70, clientY: 60 },
    props
  );
  canvas.dispatchEvent(event);
}

test('draws scaled touch strokes, changes tools, clears and ignores other pointers', () => {
  const context = Object.fromEntries(
    ['beginPath', 'moveTo', 'lineTo', 'stroke', 'clearRect'].map(key => [
      key,
      jest.fn(),
    ])
  );
  const { root, canvas } = setup(context);
  pointer(canvas, 'pointermove');
  pointer(canvas, 'pointerdown', { button: 2 });
  expect(context.stroke).not.toHaveBeenCalled();
  pointer(canvas, 'pointerdown');
  expect(canvas.setPointerCapture).toHaveBeenCalledWith(1);
  expect(context.moveTo).toHaveBeenCalledWith(120, 80);
  pointer(canvas, 'pointerdown', { pointerId: 2 });
  pointer(canvas, 'pointerup', { pointerId: 2 });
  root.querySelector('[type=color]').value = '#ff0000';
  root.querySelector('[type=range]').value = '20';
  pointer(canvas, 'pointermove', { clientX: 130 });
  expect(context.strokeStyle).toBe('#ff0000');
  expect(context.lineWidth).toBe(20);
  root.querySelector('[type=checkbox]').checked = true;
  pointer(canvas, 'pointerup');
  expect(context.globalCompositeOperation).toBe('destination-out');
  const count = context.stroke.mock.calls.length;
  pointer(canvas, 'pointermove');
  expect(context.stroke).toHaveBeenCalledTimes(count);
  for (const type of ['pointercancel', 'lostpointercapture']) {
    pointer(canvas, 'pointerdown');
    pointer(canvas, type);
    const before = context.stroke.mock.calls.length;
    pointer(canvas, 'pointermove');
    expect(context.stroke).toHaveBeenCalledTimes(before);
  }
  root.querySelector('button').click();
  expect(context.clearRect).toHaveBeenCalledWith(0, 0, 1200, 800);
});

test('toggles full viewport and Escape without resetting the bitmap', () => {
  const { root, canvas } = setup(null);
  const button = root.querySelectorAll('button')[1];
  const original = canvas.width;
  const originalStyle = canvas.style.cssText;
  const controls = root.querySelector('details');
  expect(controls.open).toBe(true);
  expect(controls.querySelectorAll('input')).toHaveLength(3);
  expect(controls.querySelectorAll('button')).toHaveLength(2);
  root.querySelector('summary').click();
  expect(controls.open).toBe(false);
  button.click();
  expect(root.style.position).toBe('fixed');
  expect(root.style.gridTemplateRows).toBe('auto minmax(0,1fr)');
  expect(canvas.style.height).toBe('100%');
  expect(canvas.style.maxHeight).toBe('none');
  expect(controls.open).toBe(false);
  expect(button.getAttribute('aria-pressed')).toBe('true');
  root.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
  expect(root.style.position).toBe('fixed');
  root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  expect(root.style.position).toBe('');
  expect(canvas.width).toBe(original);
  expect(canvas.style.cssText).toBe(originalStyle);
  root.querySelector('summary').click();
  expect(controls.open).toBe(true);
  root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  button.click();
  button.click();
  expect(button.textContent).toBe('Full screen');
});

test('toy provides the paint presenter payload', () => {
  expect(paint()).toBe('{}');
});
