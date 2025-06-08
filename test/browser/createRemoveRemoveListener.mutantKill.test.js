import { describe, it, expect, jest } from '@jest/globals';
import { setupRemoveButton } from '../../src/browser/toys.js';

describe('createRemoveRemoveListener mutant killer', () => {
  it('returns a disposer that removes the added listener', () => {
    const dom = {
      setTextContent: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    const button = {};
    const rows = { k: 'v' };
    const render = jest.fn();
    const disposers = [];

    setupRemoveButton(dom, button, rows, render, 'k', disposers);

    expect(disposers).toHaveLength(1);
    const dispose = disposers[0];
    expect(typeof dispose).toBe('function');

    const [, , addedHandler] = dom.addEventListener.mock.calls[0];
    dispose();

    expect(dom.removeEventListener).toHaveBeenCalledWith(button, 'click', addedHandler);
  });
});
