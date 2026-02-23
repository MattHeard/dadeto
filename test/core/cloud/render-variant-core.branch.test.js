import * as renderVariantCore from '../../../src/core/cloud/render-variant/render-variant-core.js';

const { renderVariantCoreTestUtils } = renderVariantCore;

describe('renderVariantCoreTestUtils', () => {
  test('extractVariantName falls back to empty string', () => {
    expect(renderVariantCoreTestUtils.extractVariantName({})).toBe('');
  });

  test('resolveVisibilityThreshold returns default when undefined', () => {
    expect(
      renderVariantCore.resolveVisibilityThreshold(undefined)
    ).toBe(renderVariantCore.VISIBILITY_THRESHOLD);
  });
});
