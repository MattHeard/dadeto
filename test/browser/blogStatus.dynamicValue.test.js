import { describe, it, expect } from '@jest/globals';
import { shouldCopyStateForFetch } from '../../src/browser/data.js';

describe('BLOG_STATUS dynamic value check', () => {
  it('shouldCopyStateForFetch returns true for idle status', () => {
    expect(shouldCopyStateForFetch('idle')).toBe(true);
  });
});
