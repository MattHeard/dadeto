import { describe, it, expect, jest } from '@jest/globals';
import { createUpdateTextInputValue } from '../../src/browser/toys.js';

describe('createUpdateTextInputValue mutant killer', () => {
  it('delegates DOM helpers to update input value', () => {
    const textInput = {};
    const dom = {
      getTargetValue: jest.fn(() => 'val'),
      setValue: jest.fn(),
    };
    const event = {};

    const updateHandler = createUpdateTextInputValue(textInput, dom);
    expect(typeof updateHandler).toBe('function');

    const result = updateHandler(event);

    expect(result).toBeUndefined();
    expect(dom.getTargetValue).toHaveBeenCalledWith(event);
    expect(dom.setValue).toHaveBeenCalledWith(textInput, 'val');
  });
});
