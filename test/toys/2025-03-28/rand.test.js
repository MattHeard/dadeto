import { rand } from '../../../src/core/browser/toys/2025-03-28/rand.js';

describe('rand', () => {
  test('ignores the string input and returns the result of getRandomNumber', () => {
    // Create a simple mock function that returns 42
    const mockGetRandomNumber = () => 42;

    // Create a Map with the mock function
    const env = new Map([['getRandomNumber', mockGetRandomNumber]]);

    // Call rand with any string and the env Map
    const result = rand('any string', env);

    // Verify rand returns the result of the mock function
    expect(result).toBe(42);
  });

  test('works with different string inputs', () => {
    // Create a simple mock function that returns 99
    const mockGetRandomNumber = () => 99;
    const env = new Map([['getRandomNumber', mockGetRandomNumber]]);

    // Test with different strings - all should return 99
    expect(rand('', env)).toBe(99);
    expect(rand('hello', env)).toBe(99);
    expect(rand('12345', env)).toBe(99);
  });

  test('returns different values when getRandomNumber returns different values', () => {
    // Create a mock function that returns different values on successive calls
    let callCount = 0;
    const mockGetRandomNumber = () => {
      callCount += 1;
      return callCount; // Returns 1, 2, 3 on successive calls
    };

    const env = new Map([['getRandomNumber', mockGetRandomNumber]]);

    // Each call should return the corresponding value
    expect(rand('test', env)).toBe(1);
    expect(rand('test', env)).toBe(2);
    expect(rand('test', env)).toBe(3);
  });

  test('throws when helper is missing', () => {
    const env = new Map();
    expect(() => rand('test', env)).toThrow(
      'getRandomNumber helper is missing'
    );
  });
});
