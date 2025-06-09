import { describe, it, expect } from '@jest/globals';
import { getUuid } from '../../src/browser/document.js';

describe('getUuid', () => {
  it('returns a valid uuid', () => {
    const id = getUuid();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it('returns unique values', () => {
    const first = getUuid();
    const second = getUuid();
    expect(first).not.toBe(second);
  });
});
