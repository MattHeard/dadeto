import { describe, it, expect, jest } from '@jest/globals';
import { setupRemoveButton } from '../../src/browser/toys.js';

// Extra test exercising the disposer returned by createRemoveRemoveListener
// directly to ensure the underlying mutation is detected.

describe('createRemoveRemoveListener additional invocation', () => {
  it('removes the click listener each time dispose is called', () => {
    const dom = {
      setTextContent: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    const button = {};
    const rows = {};
    const render = jest.fn();
    const disposers = [];

    setupRemoveButton(dom, button, rows, render, 'k', disposers);

    expect(disposers).toHaveLength(1);
    const dispose = disposers[0];
    const [, , handler] = dom.addEventListener.mock.calls[0];

    // Call dispose multiple times to ensure listener is always removed
    dispose();
    dispose();

    expect(dom.removeEventListener).toHaveBeenNthCalledWith(1, button, 'click', handler);
    expect(dom.removeEventListener).toHaveBeenNthCalledWith(2, button, 'click', handler);
  });
});
