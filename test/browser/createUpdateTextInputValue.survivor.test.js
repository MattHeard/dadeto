import { describe, it, expect, jest } from '@jest/globals';
import { createUpdateTextInputValue } from '../../src/browser/toys.js';

describe('createUpdateTextInputValue survivor killer', () => {
  it('updates the text input using dom utilities', () => {
    const textInput = {};
    const dom = {
      getTargetValue: jest.fn(() => 'survivor'),
      setValue: jest.fn(),
    };
    const handler = createUpdateTextInputValue(textInput, dom);
    expect(typeof handler).toBe('function');
    handler({});
    expect(dom.getTargetValue).toHaveBeenCalled();
    expect(dom.setValue).toHaveBeenCalledWith(textInput, 'survivor');
  });
});
