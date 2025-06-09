import { test, expect, jest } from '@jest/globals';

const textInput = {};
const dom = {
  getTargetValue: jest.fn(() => 'isolated'),
  setValue: jest.fn(),
};

// Use isolateModulesAsync to ensure Stryker instruments the module correctly
test('createUpdateTextInputValue isolated import forwards the value', async () => {
  await jest.isolateModulesAsync(async () => {
    const { createUpdateTextInputValue } = await import('../../src/browser/toys.js');
    const handler = createUpdateTextInputValue(textInput, dom);
    const evt = {};
    handler(evt);
    expect(dom.getTargetValue).toHaveBeenCalledWith(evt);
    expect(dom.setValue).toHaveBeenCalledWith(textInput, 'isolated');
  });
});
