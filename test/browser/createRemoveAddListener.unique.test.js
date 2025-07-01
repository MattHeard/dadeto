import { describe, it, expect, jest } from '@jest/globals';
import { setupAddButton } from '../../src/browser/toys.js';

describe('createRemoveAddListener unique disposers', () => {
  it('returns distinct dispose functions for each call', () => {
    const dom = {
      setTextContent: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    const rows = {};
    const render = jest.fn();
    const disposers = [];

    const btnA = {};
    setupAddButton({ dom, button: btnA, rows, render, disposers });
    const disposeA = disposers.pop();

    const btnB = {};
    setupAddButton({ dom, button: btnB, rows, render, disposers });
    const disposeB = disposers.pop();

    expect(typeof disposeA).toBe('function');
    expect(typeof disposeB).toBe('function');
    expect(disposeA).not.toBe(disposeB);

    const handlerA = dom.addEventListener.mock.calls[0][2];
    const handlerB = dom.addEventListener.mock.calls[1][2];

    disposeA();
    disposeB();

    expect(dom.removeEventListener).toHaveBeenNthCalledWith(1, btnA, 'click', handlerA);
    expect(dom.removeEventListener).toHaveBeenNthCalledWith(2, btnB, 'click', handlerB);
  });
});
