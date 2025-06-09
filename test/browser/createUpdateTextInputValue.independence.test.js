import { test, expect, jest } from '@jest/globals';
import { createUpdateTextInputValue } from '../../src/browser/toys.js';

test('createUpdateTextInputValue creates unary handlers bound to each input', () => {
  const textInputA = {};
  const textInputB = {};
  const domA = { getTargetValue: jest.fn(() => 'a'), setValue: jest.fn() };
  const domB = { getTargetValue: jest.fn(() => 'b'), setValue: jest.fn() };

  const handlerA = createUpdateTextInputValue(textInputA, domA);
  const handlerB = createUpdateTextInputValue(textInputB, domB);

  expect(typeof handlerA).toBe('function');
  expect(typeof handlerB).toBe('function');
  expect(handlerA.length).toBe(1);
  expect(handlerB.length).toBe(1);

  const eventA = {};
  const eventB = {};
  handlerA(eventA);
  handlerB(eventB);

  expect(domA.getTargetValue).toHaveBeenCalledWith(eventA);
  expect(domB.getTargetValue).toHaveBeenCalledWith(eventB);
  expect(domA.setValue).toHaveBeenCalledWith(textInputA, 'a');
  expect(domB.setValue).toHaveBeenCalledWith(textInputB, 'b');
});
