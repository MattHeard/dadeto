import { describe, expect, test } from '@jest/globals';
import {
  formatToyError,
  formatToyConversionError,
} from '../../../../src/core/browser/toys/formatToyError.js';

describe('toy error formatting', () => {
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
