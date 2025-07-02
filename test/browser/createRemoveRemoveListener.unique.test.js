import { describe, it, expect, jest } from '@jest/globals';
import { setupRemoveButton } from '../../src/browser/toys.js';

// Additional test ensuring each call to setupRemoveButton returns a unique
// disposer that removes the specific handler that was added.

describe('setupRemoveButton multiple disposers', () => {
  it('returns distinct disposers for separate buttons', () => {
    const dom = {
      setTextContent: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    const buttonA = {};
    const buttonB = {};
    const rows = {};
    const render = jest.fn();
    const disposers = [];

    // First setup
    setupRemoveButton({
      dom,
      button: buttonA,
      rows,
      render,
      key: 'a',
      disposers,
    });
    const disposerA = disposers.pop();

    // Second setup
    setupRemoveButton({
      dom,
      button: buttonB,
      rows,
      render,
      key: 'b',
      disposers,
    });
    const disposerB = disposers.pop();

    expect(typeof disposerA).toBe('function');
    expect(typeof disposerB).toBe('function');
    expect(disposerA).not.toBe(disposerB);

    // Capture handlers used during setup
    const handlerA = dom.addEventListener.mock.calls[0][2];
    const handlerB = dom.addEventListener.mock.calls[1][2];

    disposerA();
    disposerB();

    expect(dom.removeEventListener).toHaveBeenNthCalledWith(
      1,
      buttonA,
      'click',
      handlerA
    );
    expect(dom.removeEventListener).toHaveBeenNthCalledWith(
      2,
      buttonB,
      'click',
      handlerB
    );
  });
});
