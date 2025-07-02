import { describe, it, expect, jest } from '@jest/globals';
import { setupRemoveButton } from '../../src/browser/toys.js';

describe('createRemoveRemoveListener call count', () => {
  it('invokes removeEventListener on dispose', () => {
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
    const handler = dom.addEventListener.mock.calls[0][2];

    dispose();

    expect(dom.removeEventListener).toHaveBeenCalledTimes(1);
    expect(dom.removeEventListener).toHaveBeenCalledWith(button, 'click', handler);
  });
});
