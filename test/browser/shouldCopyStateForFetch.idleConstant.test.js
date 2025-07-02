import { describe, it, expect } from '@jest/globals';
import { shouldCopyStateForFetch, BLOG_STATUS } from '../../src/browser/data.js';

describe('shouldCopyStateForFetch idle constant usage', () => {
  it('returns true when passed BLOG_STATUS.IDLE', () => {
    expect(shouldCopyStateForFetch(BLOG_STATUS.IDLE)).toBe(true);
  });
});
