import { describe, it, expect, jest } from '@jest/globals';
import { setupRemoveButton } from '../../src/browser/toys.js';

// Extra test to kill surviving mutant around createRemoveRemoveListener

describe('createRemoveRemoveListener mutant killer', () => {
  it('returns a disposer that removes the attached click handler', () => {
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

    const [, , handler] = dom.addEventListener.mock.calls[0];
    dispose();

    expect(dom.removeEventListener).toHaveBeenCalledWith(button, 'click', handler);
  });
});
