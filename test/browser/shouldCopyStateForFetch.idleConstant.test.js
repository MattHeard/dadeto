import { describe, it, expect } from '@jest/globals';
import {
  BLOG_STATUS,
  shouldCopyStateForFetch,
} from '../../src/browser/data.js';

describe('shouldCopyStateForFetch idle constant usage', () => {
  it('returns true when passed the string "idle"', () => {
    expect(shouldCopyStateForFetch('idle')).toBe(true);
    expect(shouldCopyStateForFetch(BLOG_STATUS.IDLE)).toBe(true);
  });
});
