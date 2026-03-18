import { hello } from '../../../src/core/browser/toys/2024-10-02/hello.js';

describe('hello', () => {
  it('should return a greeting with both words', () => {
    const result = hello();

    expect(result).toMatch(/^Hello\s+world$/);
    expect(result.split(' ')).toEqual(['Hello', 'world']);
  });
});
