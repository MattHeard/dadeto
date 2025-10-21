import { jest } from '@jest/globals';
import { createRemoveVariantHtml } from '../../../../src/core/cloud/hide-variant-html/removeVariantHtml.js';

describe('createRemoveVariantHtml', () => {
  it('throws when dependencies are not functions', () => {
    expect(() =>
      createRemoveVariantHtml({
        loadPageForVariant: null,
        buildVariantPath: jest.fn(),
        deleteRenderedFile: jest.fn(),
      })
    ).toThrow(new TypeError('loadPageForVariant must be a function'));

    expect(() =>
      createRemoveVariantHtml({
        loadPageForVariant: jest.fn(),
        buildVariantPath: null,
        deleteRenderedFile: jest.fn(),
      })
    ).toThrow(new TypeError('buildVariantPath must be a function'));

    expect(() =>
      createRemoveVariantHtml({
        loadPageForVariant: jest.fn(),
        buildVariantPath: jest.fn(),
        deleteRenderedFile: null,
      })
    ).toThrow(new TypeError('deleteRenderedFile must be a function'));
  });

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

  it('falls back to the load result when no page property is present', async () => {
    const loadResult = { slug: 'landing' };
    const loadPageForVariant = jest.fn().mockResolvedValue(loadResult);
    const buildVariantPath = jest.fn().mockReturnValue('pages/landing.html');
    const deleteRenderedFile = jest.fn().mockResolvedValue(undefined);
    const removeVariantHtml = createRemoveVariantHtml({
      loadPageForVariant,
      buildVariantPath,
      deleteRenderedFile,
    });

    await expect(removeVariantHtml()).resolves.toBeNull();

    expect(loadPageForVariant).toHaveBeenCalledWith({
      variantId: undefined,
      variantData: undefined,
      pageRef: undefined,
    });
    expect(buildVariantPath).toHaveBeenCalledWith({
      variantId: null,
      variantData: undefined,
      page: loadResult,
    });
    expect(deleteRenderedFile).toHaveBeenCalledWith('pages/landing.html');
  });
});
