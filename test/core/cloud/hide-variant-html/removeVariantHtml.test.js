import { jest } from '@jest/globals';
import {
  createBucketFileRemover,
  createHandleVariantVisibilityChange,
  createRemoveVariantHtml,
  createRemoveVariantHtmlForSnapshot,
  buildVariantPath,
  getVariantVisibility,
} from '../../../../src/core/cloud/hide-variant-html/hide-variant-html-core.js';

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

  it('defaults to null when the loader exposes an undefined variant', async () => {
    const loadPageForVariant = jest
      .fn()
      .mockResolvedValue({ page: { number: 72 }, variant: undefined });
    const buildVariantPath = jest.fn().mockReturnValue('pages/72.html');
    const deleteRenderedFile = jest.fn().mockResolvedValue(undefined);
    const removeVariantHtml = createRemoveVariantHtml({
      loadPageForVariant,
      buildVariantPath,
      deleteRenderedFile,
    });

    await expect(
      removeVariantHtml({
        variantId: 'variant-gamma',
      })
    ).resolves.toBeNull();

    expect(buildVariantPath).toHaveBeenCalledWith({
      variantId: 'variant-gamma',
      variantData: null,
      page: { number: 72 },
    });
  });

  it('handles an undefined variant property in the load result', async () => {
    const loadPageForVariant = jest
      .fn()
      .mockResolvedValue({ page: { number: 75 }, variant: undefined });
    const buildVariantPath = jest.fn().mockReturnValue('pages/75.html');
    const deleteRenderedFile = jest.fn().mockResolvedValue(undefined);
    const removeVariantHtml = createRemoveVariantHtml({
      loadPageForVariant,
      buildVariantPath,
      deleteRenderedFile,
    });

    await expect(
      removeVariantHtml({
        variantId: 'variant-zeta',
      })
    ).resolves.toBeNull();

    expect(buildVariantPath).toHaveBeenCalledWith({
      variantId: 'variant-zeta',
      variantData: null,
      page: { number: 75 },
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

describe('createBucketFileRemover', () => {
  it('throws when storage bucket helper is missing', () => {
    expect(() =>
      createBucketFileRemover({
        storage: {},
      })
    ).toThrow(new TypeError('storage.bucket must be a function'));
  });

  it('throws when bucket name is empty', () => {
    const storage = { bucket: jest.fn() };

    expect(() =>
      createBucketFileRemover({
        storage,
        bucketName: '   ',
      })
    ).toThrow(new TypeError('bucketName must be a non-empty string'));
  });

  it('ignores non-string paths', async () => {
    const deleteFn = jest.fn();
    const storage = {
      bucket: jest.fn(() => ({
        file: jest.fn(() => ({ delete: deleteFn })),
      })),
    };
    const deleteRenderedFile = createBucketFileRemover({
      storage,
      bucketName: 'variants',
    });

    await expect(deleteRenderedFile()).resolves.toBeUndefined();
    await expect(deleteRenderedFile(null)).resolves.toBeUndefined();
    await expect(deleteRenderedFile(42)).resolves.toBeUndefined();
    await expect(deleteRenderedFile('')).resolves.toBeUndefined();

    expect(storage.bucket).not.toHaveBeenCalled();
    expect(deleteFn).not.toHaveBeenCalled();
  });

  it('deletes the rendered file when provided a path', async () => {
    const deleteFn = jest.fn(() => Promise.resolve('ignored'));
    const file = jest.fn(() => ({ delete: deleteFn }));
    const bucket = jest.fn(() => ({ file }));
    const storage = { bucket };
    const deleteRenderedFile = createBucketFileRemover({
      storage,
      bucketName: 'variants',
    });

    await expect(
      deleteRenderedFile('p/12variant.html')
    ).resolves.toBeUndefined();

    expect(bucket).toHaveBeenCalledWith('variants');
    expect(file).toHaveBeenCalledWith('p/12variant.html');
    expect(deleteFn).toHaveBeenCalledWith({ ignoreNotFound: true });
  });
});

describe('buildVariantPath', () => {
  it('combines the page number and variant name', () => {
    expect(
      buildVariantPath({
        page: { number: 42 },
        variantData: { name: '-alpha' },
      })
    ).toBe('p/42-alpha.html');
  });

  it('falls back to empty segments when metadata is missing', () => {
    expect(
      buildVariantPath({
        page: { number: undefined },
        variantData: {},
      })
    ).toBe('p/.html');
  });
});

describe('createRemoveVariantHtmlForSnapshot', () => {
  it('invokes removeVariantHtml with no arguments when snapshot is missing', async () => {
    const removeVariantHtml = jest.fn().mockResolvedValue(null);
    const adapter = createRemoveVariantHtmlForSnapshot(removeVariantHtml);

    await expect(adapter(null)).resolves.toBeNull();

    expect(removeVariantHtml).toHaveBeenCalledWith();
  });

  it('adapts snapshot data and forwards it to removeVariantHtml', async () => {
    const removeVariantHtml = jest.fn().mockResolvedValue(null);
    const adapter = createRemoveVariantHtmlForSnapshot(removeVariantHtml);
    const variantData = { visibility: 0.2 };
    const pageRef = { parent: { parent: { id: 'pageRef' } } };
    const snapshot = {
      id: 'variant-123',
      data: () => variantData,
      ref: pageRef,
    };

    await expect(adapter(snapshot)).resolves.toBeNull();

    expect(removeVariantHtml).toHaveBeenCalledWith({
      variantId: 'variant-123',
      variantData,
      pageRef: pageRef.parent.parent,
    });
  });

  it('leaves variant data undefined when snapshot data is not a function', async () => {
    const removeVariantHtml = jest.fn().mockResolvedValue(null);
    const adapter = createRemoveVariantHtmlForSnapshot(removeVariantHtml);
    const snapshot = {
      id: 'variant-without-data',
      data: undefined,
      ref: {},
    };

    await expect(adapter(snapshot)).resolves.toBeNull();

    expect(removeVariantHtml).toHaveBeenCalledWith({
      variantId: 'variant-without-data',
      variantData: undefined,
      pageRef: null,
    });
  });

  it('normalizes missing snapshot identifiers to null', async () => {
    const removeVariantHtml = jest.fn().mockResolvedValue(null);
    const adapter = createRemoveVariantHtmlForSnapshot(removeVariantHtml);
    const snapshot = {
      data: () => ({ name: 'delta' }),
      ref: { parent: { parent: { id: 'pageRef' } } },
    };

    await expect(adapter(snapshot)).resolves.toBeNull();

    expect(removeVariantHtml).toHaveBeenCalledWith({
      variantId: null,
      variantData: { name: 'delta' },
      pageRef: snapshot.ref.parent.parent,
    });
  });
});

describe('getVariantVisibility', () => {
  it('returns zero when the snapshot is missing', () => {
    expect(getVariantVisibility(null)).toBe(0);
    expect(getVariantVisibility({})).toBe(0);
  });

  it('returns the numeric visibility value from snapshot data', () => {
    const snapshot = {
      data: () => ({ visibility: 0.75 }),
    };

    expect(getVariantVisibility(snapshot)).toBe(0.75);
  });

  it('returns zero when visibility is not a number', () => {
    const snapshot = {
      data: () => ({ visibility: 'hidden' }),
    };

    expect(getVariantVisibility(snapshot)).toBe(0);
  });
});

describe('createHandleVariantVisibilityChange', () => {
  it('requires function dependencies', () => {
    expect(() => createHandleVariantVisibilityChange({})).toThrow(
      new TypeError('removeVariantHtmlForSnapshot must be a function')
    );
  });

  it('removes HTML when the variant is deleted', async () => {
    const removeVariantHtmlForSnapshot = jest.fn().mockResolvedValue(null);
    const handleChange = createHandleVariantVisibilityChange({
      removeVariantHtmlForSnapshot,
    });
    const before = { id: 'before' };

    await expect(
      handleChange({ before, after: { exists: false } })
    ).resolves.toBeNull();

    expect(removeVariantHtmlForSnapshot).toHaveBeenCalledWith(before);
  });

  it('removes HTML when visibility crosses below the threshold', async () => {
    const removeVariantHtmlForSnapshot = jest.fn().mockResolvedValue(null);
    const getVisibility = jest
      .fn()
      .mockReturnValueOnce(0.6)
      .mockReturnValueOnce(0.25);
    const handleChange = createHandleVariantVisibilityChange({
      removeVariantHtmlForSnapshot,
      getVisibility,
      visibilityThreshold: 0.5,
    });
    const after = { id: 'after' };

    await expect(
      handleChange({
        before: { id: 'before' },
        after: { ...after, exists: true },
      })
    ).resolves.toBeNull();

    expect(removeVariantHtmlForSnapshot).toHaveBeenCalledWith({
      ...after,
      exists: true,
    });
  });

  it('returns null when visibility remains above the threshold', async () => {
    const removeVariantHtmlForSnapshot = jest.fn().mockResolvedValue(null);
    const handleChange = createHandleVariantVisibilityChange({
      removeVariantHtmlForSnapshot,
    });
    const before = { id: 'before' };
    const after = { id: 'after', exists: true };

    await expect(handleChange({ before, after })).resolves.toBeNull();

    expect(removeVariantHtmlForSnapshot).not.toHaveBeenCalled();
  });
});
