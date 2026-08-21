import { describe, test, expect } from '@jest/globals';
import { isEscapeKeydown } from '../../src/core/browser/inputHandlers/escapeKey.js';

describe('isEscapeKeydown', () => {
  test('detects escape keydown events', () => {
    expect(isEscapeKeydown({ type: 'keydown', key: 'Escape' })).toBe(true);
    expect(isEscapeKeydown({ type: 'keydown', key: 'Enter' })).toBe(false);
  });

  test('rejects non-keydown events', () => {
    expect(isEscapeKeydown({ type: 'keyup', key: 'Escape' })).toBe(false);
  });
});
