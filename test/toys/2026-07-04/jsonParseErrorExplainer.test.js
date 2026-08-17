import { describe, expect, test } from '@jest/globals';
import {
  extractLocation,
  jsonParseErrorExplainer,
  toLineColumn,
} from '../../../src/core/browser/toys/2026-07-04/jsonParseErrorExplainer.js';

describe('jsonParseErrorExplainer', () => {
  test('returns the parsed value for valid JSON', () => {
    expect(jsonParseErrorExplainer('{"a":[1,2,3]}')).toBe(
      JSON.stringify({
        ok: true,
        value: {
          a: [1, 2, 3],
        },
      })
    );
  });

  test('returns a structured error with message, location, and length', () => {
    const output = JSON.parse(jsonParseErrorExplainer('{"a":1,}'));

    expect(output).toMatchObject({
      ok: false,
      error: {
        message: expect.any(String),
        approximateFailureLocation: {
          index: expect.any(Number),
          line: expect.any(Number),
          column: expect.any(Number),
        },
        originalInputLength: 8,
      },
    });
    expect(
      output.error.approximateFailureLocation.index
    ).toBeGreaterThanOrEqual(0);
    expect(output.error.approximateFailureLocation.line).toBeGreaterThanOrEqual(
      1
    );
    expect(
      output.error.approximateFailureLocation.column
    ).toBeGreaterThanOrEqual(1);
  });

  test('returns null location values when the parser error has no position', () => {
    const output = JSON.parse(jsonParseErrorExplainer(''));

    expect(output).toMatchObject({
      ok: false,
      error: {
        originalInputLength: 0,
        approximateFailureLocation: {
          index: null,
          line: null,
          column: null,
        },
      },
    });
  });

  test('uses line and column values when the parser message exposes them', () => {
    const originalParse = JSON.parse;
    JSON.parse = () => {
      throw new SyntaxError('Unexpected token } in JSON at line 2 column 7');
    };

    try {
      const output = originalParse(jsonParseErrorExplainer('{"a":\n1 }'));

      expect(output).toMatchObject({
        ok: false,
        error: {
          approximateFailureLocation: {
            index: null,
            line: 2,
            column: 7,
          },
          originalInputLength: 9,
        },
      });
      expect(output.error.message).toBe(
        'Unexpected token } in JSON at line 2 column 7'
      );
    } finally {
      JSON.parse = originalParse;
    }
  });

  test('falls back to null location values for non-error throws and non-finite indexes', () => {
    expect(extractLocation('boom', 'abc')).toEqual({
      index: null,
      line: null,
      column: null,
    });
    expect(toLineColumn('abc', Number.POSITIVE_INFINITY)).toEqual({
      index: 0,
      line: 1,
      column: 1,
    });
    expect(toLineColumn('abc', -2)).toEqual({
      index: 0,
      line: 1,
      column: 1,
    });
  });

  test('extracts multi-digit position values with flexible whitespace', () => {
    expect(
      extractLocation(
        new SyntaxError('Unexpected token at POSITION   12'),
        'abcdefghijklmnop'
      )
    ).toEqual({
      index: 12,
      line: 1,
      column: 13,
    });
  });

  test('extracts multi-digit line and column values with flexible whitespace', () => {
    expect(
      extractLocation(
        new SyntaxError('Unexpected token at LINE   12   COLUMN   34'),
        'input'
      )
    ).toEqual({
      index: null,
      line: 12,
      column: 34,
    });
  });

  test('uses the default message when JSON.parse throws a non-error value', () => {
    const originalParse = JSON.parse;
    JSON.parse = () => {
      throw 'boom';
    };

    try {
      const output = originalParse(jsonParseErrorExplainer('{"a":1}'));

      expect(output).toMatchObject({
        ok: false,
        error: {
          message: 'Invalid JSON input',
          approximateFailureLocation: {
            index: null,
            line: null,
            column: null,
          },
          originalInputLength: 7,
        },
      });
    } finally {
      JSON.parse = originalParse;
    }
  });

  test('uses the default message when an Error has no message', () => {
    const originalParse = JSON.parse;
    JSON.parse = () => {
      throw new SyntaxError('');
    };

    try {
      const output = originalParse(jsonParseErrorExplainer('invalid'));

      expect(output.error.message).toBe('Invalid JSON input');
    } finally {
      JSON.parse = originalParse;
    }
  });
});
