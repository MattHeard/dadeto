import { describe, it, expect, jest } from '@jest/globals';
import { setupRemoveButton } from '../../src/browser/toys.js';

describe('createRemoveRemoveListener triple calls', () => {
  it('returns functional disposers for multiple buttons', () => {
    const dom = {
      setTextContent: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    const rows = {};
    const render = jest.fn();
    const disposers = [];
    const buttons = [{}, {}, {}];

    buttons.forEach((btn, idx) => {
      setupRemoveButton(dom, btn, rows, render, 'k' + idx, disposers);
      const disposer = disposers[idx];
      expect(typeof disposer).toBe('function');
      const handler = dom.addEventListener.mock.calls[idx][2];
      disposer();
      expect(dom.removeEventListener).toHaveBeenNthCalledWith(
        idx + 1,
        btn,
        'click',
        handler
      );
    });
  });
});
