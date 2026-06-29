import * as renderVariantCore from '../../../src/core/cloud/render-variant/render-variant-core.js';

const { renderVariantCoreTestUtils } = renderVariantCore;

describe('renderVariantCoreTestUtils', () => {
  test('extractVariantName falls back to empty string', () => {
    expect(renderVariantCoreTestUtils.extractVariantName({})).toBe('');
  });

  test('resolveVisibilityThreshold returns default when undefined', () => {
    expect(renderVariantCore.resolveVisibilityThreshold(undefined)).toBe(
      renderVariantCore.VISIBILITY_THRESHOLD
    );
  });

  test('hasVisibleVariants checks for any visible snapshot', () => {
    expect(
      renderVariantCoreTestUtils.hasVisibleVariants(
        [{ data: () => ({ visibility: 0.25 }) }],
        0.5
      )
    ).toBe(false);
    expect(
      renderVariantCoreTestUtils.hasVisibleVariants(
        [{ data: () => ({ visibility: 0.75 }) }],
        0.5
      )
    ).toBe(true);
    expect(
      renderVariantCoreTestUtils.hasVisibleVariants([{ data: () => ({}) }], 0.5)
    ).toBe(true);
  });
});
