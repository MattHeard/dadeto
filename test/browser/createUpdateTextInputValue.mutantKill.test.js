import { describe, it, expect, jest } from '@jest/globals';
import { createUpdateTextInputValue } from '../../src/browser/toys.js';

describe('createUpdateTextInputValue mutant kill', () => {
  it('updates the text input for each event', () => {
    const textInput = {};
    const dom = {
      getTargetValue: jest.fn()
        .mockReturnValueOnce('one')
        .mockReturnValueOnce('two')
        .mockReturnValueOnce('three'),
      setValue: jest.fn(),
    };

    const handler = createUpdateTextInputValue(textInput, dom);
    expect(typeof handler).toBe('function');

    const ev1 = {};
    const ev2 = {};
    const ev3 = {};

    handler(ev1);
    handler(ev2);
    handler(ev3);

    expect(dom.getTargetValue).toHaveBeenNthCalledWith(1, ev1);
    expect(dom.getTargetValue).toHaveBeenNthCalledWith(2, ev2);
    expect(dom.getTargetValue).toHaveBeenNthCalledWith(3, ev3);
    expect(dom.setValue).toHaveBeenNthCalledWith(1, textInput, 'one');
    expect(dom.setValue).toHaveBeenNthCalledWith(2, textInput, 'two');
    expect(dom.setValue).toHaveBeenNthCalledWith(3, textInput, 'three');
  });
});
