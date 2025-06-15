import { describe, test, expect } from '@jest/globals';
import { BLOG_STATUS } from '../../src/browser/data.js';

// Ensure BLOG_STATUS constant contains expected keys and values
// This guards against mutations that change the object structure
// or the string values used for each status.
describe('BLOG_STATUS constant source', () => {
  test('definition includes all expected status values', () => {
    expect(BLOG_STATUS).toEqual({
      IDLE: 'idle',
      LOADING: 'loading',
      LOADED: 'loaded',
      ERROR: 'error',
    });
  });
});
