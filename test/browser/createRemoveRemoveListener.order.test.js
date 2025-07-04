import { describe, it, expect, jest } from '@jest/globals';
import { setupRemoveButton } from '../../src/browser/toys.js';

describe('createRemoveRemoveListener order of disposal', () => {
  it('each disposer only removes its associated listener', () => {
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

    setupRemoveButton({
      dom,
      button: buttonA,
      rows,
      render,
      key: 'a',
      disposers,
    });
    const disposeA = disposers.pop();
    setupRemoveButton({
      dom,
      button: buttonB,
      rows,
      render,
      key: 'b',
      disposers,
    });
    const disposeB = disposers.pop();

    const handlerA = dom.addEventListener.mock.calls[0][2];
    const handlerB = dom.addEventListener.mock.calls[1][2];

    disposeA();
    expect(dom.removeEventListener).toHaveBeenCalledTimes(1);
    expect(dom.removeEventListener).toHaveBeenCalledWith(
      buttonA,
      'click',
      handlerA
    );

    disposeB();
    expect(dom.removeEventListener).toHaveBeenCalledTimes(2);
    expect(dom.removeEventListener).toHaveBeenNthCalledWith(
      2,
      buttonB,
      'click',
      handlerB
    );
  });
});
