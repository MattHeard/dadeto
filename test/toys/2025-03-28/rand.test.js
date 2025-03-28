import { rand } from '../../../src/toys/2025-03-28/rand.js';

describe('rand', () => {
  test('ignores the string input and returns the result of getRandomNumber', () => {
    // Create a simple mock function that returns 42
    const mockGetRandomNumber = () => 42;
    
    // Create a Map with the mock function
    const dependencies = new Map([
      ["getRandomNumber", mockGetRandomNumber]
    ]);
    
    // Call rand with any string and the dependencies Map
    const result = rand("any string", dependencies);
    
    // Verify rand returns the result of the mock function
    expect(result).toBe(42);
  });
  
  test('works with different string inputs', () => {
    // Create a simple mock function that returns 99
    const mockGetRandomNumber = () => 99;
    const dependencies = new Map([
      ["getRandomNumber", mockGetRandomNumber]
    ]);
    
    // Test with different strings - all should return 99
    expect(rand("", dependencies)).toBe(99);
    expect(rand("hello", dependencies)).toBe(99);
    expect(rand("12345", dependencies)).toBe(99);
  });
  
  test('returns different values when getRandomNumber returns different values', () => {
    // Create a mock function that returns different values on successive calls
    let callCount = 0;
    const mockGetRandomNumber = () => {
      callCount += 1;
      return callCount; // Returns 1, 2, 3 on successive calls
    };
      
    const dependencies = new Map([
      ["getRandomNumber", mockGetRandomNumber]
    ]);
    
    // Each call should return the corresponding value
    expect(rand("test", dependencies)).toBe(1);
    expect(rand("test", dependencies)).toBe(2);
    expect(rand("test", dependencies)).toBe(3);
  });
});
