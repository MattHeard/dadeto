import { describe, expect, test } from '@jest/globals';
import { jsonCanonicalizer } from '../../../src/core/browser/toys/2026-07-04/jsonCanonicalizer.js';

describe('jsonCanonicalizer', () => {
  test('pretty-prints sorted objects recursively', () => {
    const input = JSON.stringify({
      zebra: 1,
      alpha: {
        delta: 4,
        beta: 2,
      },
      beta: [
        {
          y: 2,
          x: 1,
        },
        3,
      ],
    });

    expect(jsonCanonicalizer(input)).toBe(`{
  "alpha": {
    "beta": 2,
    "delta": 4
  },
  "beta": [
    {
      "x": 1,
      "y": 2
    },
    3
  ],
  "zebra": 1
}`);
  });

  test('preserves arrays and scalar values', () => {
    expect(jsonCanonicalizer(JSON.stringify([3, { b: 2, a: 1 }, 'x']))).toBe(`[
  3,
  {
    "a": 1,
    "b": 2
  },
  "x"
]`);
    expect(jsonCanonicalizer(JSON.stringify(true))).toBe('true');
    expect(jsonCanonicalizer(JSON.stringify(null))).toBe('null');
    expect(jsonCanonicalizer(JSON.stringify(42))).toBe('42');
  });

  test('returns a structured error for malformed JSON', () => {
    expect(jsonCanonicalizer('{')).toBe(
      JSON.stringify({
        error: 'Invalid JSON input: malformed JSON',
      })
    );
  });
});
