import { test, expect, jest } from '@jest/globals';
import { setupAddButton } from '../../src/browser/toys.js';

test('setupAddButton disposer removes the exact click handler after invocation', () => {
  const dom = {
    setTextContent: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };
  const btn = {};
  const rows = {};
  const render = jest.fn();
  const disposers = [];

  setupAddButton({ dom, button: btn, rows, render, disposers });

  expect(disposers).toHaveLength(1);
  const dispose = disposers[0];
  expect(typeof dispose).toBe('function');

  const [, , handler] = dom.addEventListener.mock.calls[0];
  handler();
  expect(rows).toHaveProperty('');
  expect(render).toHaveBeenCalled();

  dispose();
  expect(dom.removeEventListener).toHaveBeenCalledWith(btn, 'click', handler);
});
