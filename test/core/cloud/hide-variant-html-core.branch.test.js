import { hideVariantHtmlTestUtils } from '../../../src/core/cloud/hide-variant-html/hide-variant-html-core.js';

describe('hideVariantHtmlTestUtils', () => {
  test('resolvePageRef returns null when ref missing', () => {
    expect(hideVariantHtmlTestUtils.resolvePageRef({})).toBeNull();
  });

  test('hasValidGrandparentChain handles incomplete refs', () => {
    expect(hideVariantHtmlTestUtils.hasValidGrandparentChain(null)).toBe(false);
  });

  test('resolveParentPageRef returns null when chain invalid', () => {
    expect(hideVariantHtmlTestUtils.resolveParentPageRef(null)).toBeNull();
  });

  test('hasParentWithGrandparent returns false for shallow refs', () => {
    expect(
      hideVariantHtmlTestUtils.hasParentWithGrandparent({ parent: null })
    ).toBe(false);
  });

  test('hasGrandparent returns false for empty ref', () => {
    expect(hideVariantHtmlTestUtils.hasGrandparent(null)).toBe(false);
  });

  test('extractGrandparentRef returns null when invalid', () => {
    expect(hideVariantHtmlTestUtils.extractGrandparentRef(null)).toBeNull();
  });
});
