import { describe, it, expect, jest } from '@jest/globals';
import { setupRemoveButton } from '../../src/browser/toys.js';

describe('setupRemoveButton removes specific listener', () => {
  it('cleanup removes the same handler that was added', () => {
    const dom = {
      setTextContent: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    const button = {};
    const rows = { a: 1 };
    const render = jest.fn();
    const disposers = [];

    setupRemoveButton(dom, button, rows, render, 'a', disposers);

    expect(dom.addEventListener).toHaveBeenCalledWith(
      button,
      'click',
      expect.any(Function)
    );
    expect(disposers).toHaveLength(1);
    const dispose = disposers[0];
    const [, , handler] = dom.addEventListener.mock.calls[0];

    dispose();

    expect(dom.removeEventListener).toHaveBeenCalledWith(
      button,
      'click',
      handler
    );
  });
});
