import { describe, it, expect, jest } from '@jest/globals';
import { createUpdateTextInputValue } from '../../src/browser/toys.js';

describe('createUpdateTextInputValue multiple calls', () => {
  it('updates the input using the latest value each time', () => {
    const textInput = {};
    const dom = {
      getTargetValue: jest.fn()
        .mockReturnValueOnce('first')
        .mockReturnValueOnce('second'),
      setValue: jest.fn(),
    };
    const handler = createUpdateTextInputValue(textInput, dom);
    const evtA = {};
    const evtB = {};
    handler(evtA);
    handler(evtB);
    expect(dom.getTargetValue).toHaveBeenNthCalledWith(1, evtA);
    expect(dom.getTargetValue).toHaveBeenNthCalledWith(2, evtB);
    expect(dom.setValue).toHaveBeenNthCalledWith(1, textInput, 'first');
    expect(dom.setValue).toHaveBeenNthCalledWith(2, textInput, 'second');
  });
});
