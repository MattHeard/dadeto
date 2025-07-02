import { describe, it, expect, jest } from '@jest/globals';
import { setupRemoveButton } from '../../src/browser/toys.js';

describe('createRemoveRemoveListener multiple disposals', () => {
  it('removes the listener each time the disposer is called', () => {
    const dom = {
      setTextContent: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    const button = {};
    const rows = {};
    const render = jest.fn();
    const disposers = [];

    setupRemoveButton({
      dom,
      button,
      rows,
      render,
      key: 'k',
      disposers,
    });

    expect(disposers).toHaveLength(1);
    const dispose = disposers[0];
    expect(typeof dispose).toBe('function');

    const handler = dom.addEventListener.mock.calls[0][2];

    dispose();
    dispose();

    expect(dom.removeEventListener).toHaveBeenNthCalledWith(1, button, 'click', handler);
    expect(dom.removeEventListener).toHaveBeenNthCalledWith(2, button, 'click', handler);
  });
});
