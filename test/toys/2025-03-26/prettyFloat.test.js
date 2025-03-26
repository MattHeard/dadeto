import { decomposeFloat } from '../../../src/toys/2025-03-26/prettyFloat.js';

describe('decomposeFloat', () => {
  test('handles zero', () => {
    expect(decomposeFloat(0.0)).toBe("0 (0 × 2^0)");
    expect(decomposeFloat(-0.0)).toBe("0 (-0 × 2^0)");
  });

  test('handles positive powers of two', () => {
    expect(decomposeFloat(1.0)).toBe("1 (4503599627370496 × 2^-52)");
    expect(decomposeFloat(0.5)).toBe("0.5 (4503599627370496 × 2^-53)");
    expect(decomposeFloat(2.0)).toBe("2 (4503599627370496 × 2^-51)");
  });

  test('handles small irrational approximations', () => {
    expect(decomposeFloat(0.1)).toBe("0.10000000000000001 (7205759403792794 × 2^-56)");
  });

  test('handles negative values', () => {
    expect(decomposeFloat(-1.0)).toBe("-1 (-4503599627370496 × 2^-52)");
    expect(decomposeFloat(-3.5)).toBe("-3.5 (-7881299347898368 × 2^-51)");
  });

  test('handles max safe integer', () => {
    expect(decomposeFloat(Number.MAX_SAFE_INTEGER)).toBe("9007199254740991 (9007199254740991 × 2^0)");
  });

  test('returns empty string for Infinity and -Infinity', () => {
    expect(decomposeFloat(Infinity)).toBe("");
    expect(decomposeFloat(-Infinity)).toBe("");
  });

  test('returns empty string for NaN', () => {
    expect(decomposeFloat(NaN)).toBe("");
  });
});