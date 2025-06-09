import { describe, it, expect, jest } from '@jest/globals';
import { setupAddButton } from '../../src/browser/toys.js';

describe('createRemoveAddListener additional coverage', () => {
  it('disposer removes listener and is idempotent', () => {
    const dom = {
      setTextContent: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    const btn = {};
    const rows = {};
    const render = jest.fn();
    const disposers = [];

    setupAddButton(dom, btn, rows, render, disposers);

    // disposer should be stored
    expect(disposers).toHaveLength(1);
    const dispose = disposers[0];
    expect(typeof dispose).toBe('function');

    // remove should be called with the same handler
    const [, , handler] = dom.addEventListener.mock.calls[0];
    dispose();
    expect(dom.removeEventListener).toHaveBeenCalledWith(btn, 'click', handler);

    // calling again should still remove using the same handler
    dispose();
    expect(dom.removeEventListener).toHaveBeenCalledTimes(2);
  });
});
