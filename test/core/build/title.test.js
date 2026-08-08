import { describe, expect, it } from '@jest/globals';
import { createTitleHandle, headerBanner } from '../../../src/core/build/title.js';

describe('build title', () => {
  it('returns the banner and exposes it through the handle', () => {
    expect(headerBanner()).toContain('header-banner');
    expect(createTitleHandle().headerBanner).toBe(headerBanner);
  });
});
