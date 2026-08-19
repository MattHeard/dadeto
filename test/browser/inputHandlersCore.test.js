import { describe, expect, it, jest } from '@jest/globals';
import { createUpdateTextInputValue } from '../../src/core/browser/inputHandlers/browserInputHandlersCore.js';
import { readStoredOrElementValue } from '../../src/core/browser/inputValueStore.js';

describe('createUpdateTextInputValue', () => {
  it('updates both the DOM value and the stored input value', () => {
    const textInput = { value: 'before' };
    const dom = {
      getTargetValue: jest.fn(() => 'after'),
      setValue: jest.fn(),
    };
    const handler = createUpdateTextInputValue(textInput, dom);

    handler({ target: textInput });

    expect(dom.getTargetValue).toHaveBeenCalled();
    expect(dom.setValue).toHaveBeenCalledWith(textInput, 'after');
    expect(readStoredOrElementValue(textInput)).toBe('after');
  });
});
