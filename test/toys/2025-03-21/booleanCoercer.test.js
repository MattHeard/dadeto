// booleanCoercer.test.js
import { coerceToBoolean } from '../../../src/toys/2025-03-21/booleanCoercer.js';

describe('coerceToBoolean', () => {
  test('returns { value: true } for input boolean true', () => {
    expect(coerceToBoolean(true)).toEqual({ value: true });
  });

  test('returns { value: false } for input boolean false', () => {
    expect(coerceToBoolean(false)).toEqual({ value: false });
  });

  test('returns { value: true } for input string "true"', () => {
    expect(coerceToBoolean("true")).toEqual({ value: true });
  });

  test('returns { value: false } for input string "false"', () => {
    expect(coerceToBoolean("false")).toEqual({ value: false });
  });

  test('handles case insensitivity for "TrUe"', () => {
    expect(coerceToBoolean("TrUe")).toEqual({ value: true });
  });

  test('handles case insensitivity for "FaLsE"', () => {
    expect(coerceToBoolean("FaLsE")).toEqual({ value: false });
  });

  test('returns {} for non-boolean and non-valid string input (number)', () => {
    expect(coerceToBoolean(123)).toEqual({});
  });

  test('returns {} for non-boolean and non-valid string input (object)', () => {
    expect(coerceToBoolean({})).toEqual({});
  });

  test('returns {} for non-boolean and non-valid string input (null)', () => {
    expect(coerceToBoolean(null)).toEqual({});
  });

  test('returns {} for non-boolean and non-valid string input (undefined)', () => {
    expect(coerceToBoolean(undefined)).toEqual({});
  });
});