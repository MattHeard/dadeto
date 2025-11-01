import { describe, expect, test } from '@jest/globals';
import { coerceToBoolean } from '../../../src/core/browser/toys/2025-03-21/booleanCoercer.js';

describe('coerceToBoolean', () => {
  test.each([
    [true, '{ value: true }'],
    [false, '{ value: false }'],
    ['true', '{ value: true }'],
    ['false', '{ value: false }'],
    ['TrUe', '{ value: true }'],
    ['FaLsE', '{ value: false }'],
    [123, '{}'],
    [{}, '{}'],
    [null, '{}'],
    [undefined, '{}'],
  ])('given %p when coerced then returns %s', (input, expected) => {
    // When
    const result = coerceToBoolean(input);

    // Then
    expect(result).toBe(expected);
  });
});
