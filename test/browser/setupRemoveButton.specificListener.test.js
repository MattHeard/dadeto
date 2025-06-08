import { describe, it, expect, jest } from '@jest/globals';
import { setupRemoveButton } from '../../src/browser/toys.js';

describe('setupRemoveButton disposers', () => {
  it('removes the specific handler that was added', () => {
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

    const [, , onRemove] = dom.addEventListener.mock.calls[0];
    const dispose = disposers[0];
    dispose();

    expect(dom.removeEventListener).toHaveBeenCalledWith(
      button,
      'click',
      onRemove
    );
  });
});
