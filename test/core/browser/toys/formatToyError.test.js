import { describe, expect, test } from '@jest/globals';
import {
  formatToyError,
  formatToyConversionError,
  runToyCalculation,
} from '../../../../src/core/browser/toys/formatToyError.js';

describe('toy error formatting', () => {
  test('calculation boundaries preserve success and the original failure message and indentation', () => {
    expect(runToyCalculation(() => 'unchanged')).toBe('unchanged');
    expect(
      runToyCalculation(() => {
        throw new Error('failed');
      })
    ).toBe(formatToyError('failed'));
    expect(
      runToyCalculation(() => {
        throw { message: 42 };
      }, 0)
    ).toBe('{"valid":false,"error":42}');
    expect(
      runToyCalculation(() => {
        throw 'missing message';
      }, 0)
    ).toBe('{"valid":false}');
    expect(() =>
      runToyCalculation(() => {
        throw null;
      })
    ).toThrow(TypeError);
  });
  test('supports compact legacy errors without changing pretty defaults or omitted messages', () => {
    expect(formatToyError('bad input', 0)).toBe(
      '{"valid":false,"error":"bad input"}'
    );
    expect(formatToyError('bad input')).toBe(
      '{\n  "valid": false,\n  "error": "bad input"\n}'
    );
    expect(formatToyError(undefined, 0)).toBe('{"valid":false}');
  });
  test('formats validation errors with the invalid flag', () => {
    expect(JSON.parse(formatToyError('bad input'))).toEqual({
      valid: false,
      error: 'bad input',
    });
  });

  test('formats conversion errors without the validation flag', () => {
    expect(JSON.parse(formatToyConversionError('cannot convert'))).toEqual({
      error: 'cannot convert',
    });
  });
});
