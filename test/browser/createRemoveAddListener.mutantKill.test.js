import { describe, it, expect, jest } from '@jest/globals';
import { setupAddButton } from '../../src/browser/toys.js';

// Additional test to kill surviving mutant around toys.js line 797
// Ensures setupAddButton provides a disposer that removes the exact listener

describe('createRemoveAddListener mutant killer', () => {
  it('returns a disposer that removes the added listener', () => {
    const dom = {
      setTextContent: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    const button = {};
    const rows = {};
    const render = jest.fn();
    const disposers = [];

    setupAddButton(dom, button, rows, render, disposers);

    expect(disposers).toHaveLength(1);
    const dispose = disposers[0];
    expect(typeof dispose).toBe('function');

    const [, , addedHandler] = dom.addEventListener.mock.calls[0];
    dispose();

    expect(dom.removeEventListener).toHaveBeenCalledWith(button, 'click', addedHandler);
  });
});
