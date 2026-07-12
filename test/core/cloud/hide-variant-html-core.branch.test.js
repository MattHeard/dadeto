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

  test('handles a complete legacy reference chain for helper coverage', () => {
    const pageRef = { id: 'page-ref' };
    const ref = { parent: { parent: pageRef } };

    expect(hideVariantHtmlTestUtils.hasValidGrandparentChain(ref)).toBe(true);
    expect(hideVariantHtmlTestUtils.hasParentWithGrandparent(ref)).toBe(true);
    expect(hideVariantHtmlTestUtils.hasGrandparent(ref)).toBe(true);
    expect(hideVariantHtmlTestUtils.extractGrandparentRef(ref)).toBe(pageRef);
    expect(hideVariantHtmlTestUtils.resolveParentPageRef(ref)).toBe(pageRef);
  });
});
