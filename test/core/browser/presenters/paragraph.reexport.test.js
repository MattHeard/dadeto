import { describe, expect, test } from '@jest/globals';
import { createParagraphElement as createCoreParagraphElement } from '../../../../src/core/browser/presenters/browserPresentersCore.js';
import { createParagraphElement } from '../../../../src/core/browser/presenters/paragraph.js';

describe('core browser presenters paragraph re-export', () => {
  test('matches the core paragraph presenter export', () => {
    expect(createParagraphElement).toBe(createCoreParagraphElement);
  });
});
