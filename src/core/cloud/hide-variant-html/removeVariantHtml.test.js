import { jest } from '@jest/globals';
import { createRemoveVariantHtml } from './removeVariantHtml.js';

describe('createRemoveVariantHtml', () => {
  it('resolves without deleting when the page cannot be found', async () => {
    const loadPageForVariant = jest.fn().mockResolvedValue(null);
    const buildVariantPath = jest.fn();
    const deleteRenderedFile = jest.fn();
    const removeVariantHtml = createRemoveVariantHtml({
      loadPageForVariant,
      buildVariantPath,
      deleteRenderedFile,
    });

    await expect(
      removeVariantHtml({ variantId: 'missing-variant' })
    ).resolves.toBeNull();

    expect(loadPageForVariant).toHaveBeenCalledWith({
      variantId: 'missing-variant',
      variantData: undefined,
      pageRef: undefined,
    });
    expect(buildVariantPath).not.toHaveBeenCalled();
    expect(deleteRenderedFile).not.toHaveBeenCalled();
  });

  it('computes the path and deletes the rendered file when the page exists', async () => {
    const loadPageForVariant = jest
      .fn()
      .mockResolvedValue({ page: { number: 12 } });
    const buildVariantPath = jest.fn().mockReturnValue('p/12variant-a.html');
    const deleteRenderedFile = jest.fn().mockResolvedValue(undefined);
    const removeVariantHtml = createRemoveVariantHtml({
      loadPageForVariant,
      buildVariantPath,
      deleteRenderedFile,
    });

    await expect(
      removeVariantHtml({
        variantId: 'variant-a',
        variantData: { name: '-variant-a' },
        pageRef: { path: 'stories/story/pages/page' },
      })
    ).resolves.toBeNull();

    expect(loadPageForVariant).toHaveBeenCalledWith({
      variantId: 'variant-a',
      variantData: { name: '-variant-a' },
      pageRef: { path: 'stories/story/pages/page' },
    });
    expect(buildVariantPath).toHaveBeenCalledWith({
      variantId: 'variant-a',
      variantData: { name: '-variant-a' },
      page: { number: 12 },
    });
    expect(deleteRenderedFile).toHaveBeenCalledWith('p/12variant-a.html');
  });

  it('propagates errors from the delete callback', async () => {
    const loadPageForVariant = jest
      .fn()
      .mockResolvedValue({ page: { number: 33 }, variant: { name: '-beta' } });
    const buildVariantPath = jest.fn().mockReturnValue('p/33-beta.html');
    const deleteRenderedFile = jest
      .fn()
      .mockRejectedValue(new Error('delete failed'));
    const removeVariantHtml = createRemoveVariantHtml({
      loadPageForVariant,
      buildVariantPath,
      deleteRenderedFile,
    });

    await expect(
      removeVariantHtml({ variantId: 'variant-beta' })
    ).rejects.toThrow('delete failed');

    expect(loadPageForVariant).toHaveBeenCalledWith({
      variantId: 'variant-beta',
      variantData: undefined,
      pageRef: undefined,
    });
    expect(buildVariantPath).toHaveBeenCalledWith({
      variantId: 'variant-beta',
      variantData: { name: '-beta' },
      page: { number: 33 },
    });
  });
});
