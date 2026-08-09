import { jest } from '@jest/globals';
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

  test('covers option href and pending-path fallbacks', () => {
    const utils = renderVariantCoreTestUtils;
    expect(utils.readSnapshotData()).toEqual({});
    expect(utils.readSnapshotData({ data: null })).toEqual({});
    expect(utils.readSnapshotData({ data: () => null })).toEqual({});
    expect(utils.readSnapshotData({ data: () => ({ value: 1 }) })).toEqual({
      value: 1,
    });
    expect(utils.resolveStoredVisibilitySum({ treeVisibilitySum: 2 })).toBe(2);
    expect(utils.resolveStoredVisibilitySum({ visibility: 0.75 })).toBe(0.75);
    expect(utils.resolveIncomingParentRef({}, {})).toBeNull();
    const ancestor = { parent: null };
    const optionRef = { parent: { parent: ancestor } };
    expect(
      utils.resolveIncomingParentRef(
        { incomingOption: 'options/1' },
        {
          doc: jest.fn(() => optionRef),
        }
      )
    ).toBe(ancestor);
    expect(utils.resolveOptionHref('slug', {})).toBe(
      '../new-page.html?option=slug'
    );
    expect(utils.resolveOptionHref('slug', { targetPageNumber: 7 })).toBe(
      '/p/7.html'
    );
    expect(
      utils.resolveOptionHref(
        'slug',
        { targetPageNumber: 7 },
        { rewriteTargetPageNumbers: [7] }
      )
    ).toBe('../new-page.html?page=7');
    expect(
      utils.buildOptionsItems({ pageNumber: 1, variantName: 'a', options: [] })
    ).toBe('');
    expect(
      utils.resolveStoryIdFromPath({ ref: { path: 'stories/story-1/pages/2' } })
    ).toBe('story-1');
    expect(utils.resolveStoryIdFromPath({ ref: {} })).toBeUndefined();
    expect(
      utils.resolveVariantIdFromPath({
        ref: { path: 'stories/1/pages/2/variants/v1' },
      })
    ).toBe('v1');
    expect(utils.resolveVariantIdFromPath({ ref: {} })).toBeUndefined();
  });

  test('covers tree visibility propagation fallbacks and parent updates', async () => {
    const utils = renderVariantCoreTestUtils;
    const skipped = { after: { data: () => ({}) }, before: { exists: true } };
    await utils.updateTreeVisibilityForVariantChange({
      change: skipped,
      db: {},
    });
    await utils.updateTreeVisibilityForVariantChange({
      change: {
        after: { data: () => ({ visibility: 1 }) },
        before: { exists: false },
      },
      db: {},
    });
    await utils.updateTreeVisibilityForVariantChange({
      change: { after: {}, before: { exists: false } },
      db: {},
    });
    const validRef = { get: jest.fn(), update: jest.fn() };
    await utils.updateTreeVisibilityForVariantChange({
      change: {
        after: { ref: { path: 'variants/skip' }, data: () => ({}) },
        before: { exists: true, data: () => ({}) },
      },
      db: { doc: jest.fn(() => validRef) },
    });

    const parentUpdate = jest.fn().mockResolvedValue(undefined);
    const parent = {
      update: parentUpdate,
      get: jest.fn().mockResolvedValue({ data: () => ({ visibility: 1 }) }),
    };
    const optionRef = { parent: { parent } };
    const variantRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ treeVisibilitySum: 0 }),
      }),
      update: jest.fn().mockResolvedValue(undefined),
    };
    await utils.updateTreeVisibilityForVariantChange({
      change: {
        after: {
          ref: { path: 'variants/v1' },
          data: () => ({
            visibility: 1,
            treeVisibilitySum: 1,
            incomingOption: 'options/o1',
          }),
        },
        before: { exists: true, data: () => ({ visibility: 0 }) },
      },
      db: {
        doc: jest.fn(path => (path === 'variants/v1' ? variantRef : optionRef)),
      },
    });
    const noDataRef = {
      get: jest.fn().mockResolvedValue({ exists: true }),
      update: jest.fn().mockResolvedValue(undefined),
    };
    await utils.updateTreeVisibilityForVariantChange({
      change: {
        after: {
          ref: { path: 'variants/no-data' },
          data: () => ({ visibility: 1 }),
        },
        before: { exists: false },
      },
      db: { doc: jest.fn(() => noDataRef) },
    });
    const nullDataRef = {
      get: jest.fn().mockResolvedValue({ exists: true, data: () => null }),
      update: jest.fn().mockResolvedValue(undefined),
    };
    await utils.updateTreeVisibilityForVariantChange({
      change: {
        after: {
          ref: { path: 'variants/null-data' },
          data: () => ({ visibility: 1 }),
        },
        before: { exists: false },
      },
      db: { doc: jest.fn(() => nullDataRef) },
    });
    const nullSumRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ treeVisibilitySum: null }),
      }),
      update: jest.fn().mockResolvedValue(undefined),
    };
    await utils.updateTreeVisibilityForVariantChange({
      change: {
        after: {
          ref: { path: 'variants/null-sum' },
          data: () => ({ visibility: 1 }),
        },
        before: { exists: false },
      },
      db: { doc: jest.fn(() => nullSumRef) },
    });
    const missingRef = {
      get: jest.fn().mockResolvedValue({ exists: false }),
      update: jest.fn(),
    };
    await utils.updateTreeVisibilityForVariantChange({
      change: {
        after: {
          ref: { path: 'variants/missing' },
          data: () => ({ visibility: 1 }),
        },
        before: { exists: false },
      },
      db: { doc: jest.fn(() => missingRef) },
    });
    const nullSnapshotRef = {
      get: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
    };
    await utils.updateTreeVisibilityForVariantChange({
      change: {
        after: {
          ref: { path: 'variants/null-snapshot' },
          data: () => ({ visibility: 1 }),
        },
        before: { exists: false },
      },
      db: { doc: jest.fn(() => nullSnapshotRef) },
    });
    const nullDataMethodRef = {
      get: jest.fn().mockResolvedValue({ exists: true, data: null }),
      update: jest.fn().mockResolvedValue(undefined),
    };
    await utils.updateTreeVisibilityForVariantChange({
      change: {
        after: {
          ref: { path: 'variants/null-data-method' },
          data: () => ({ visibility: 1 }),
        },
        before: { exists: false },
      },
      db: { doc: jest.fn(() => nullDataMethodRef) },
    });
    expect(variantRef.update).toHaveBeenCalledWith({ treeVisibilitySum: 1 });
    expect(parentUpdate).toHaveBeenCalledWith({ targetTreeWeightsDirty: true });
    await utils.updateTreeVisibilityForVariantChange({
      change: {
        after: {
          ref: { path: 'variants/no-change' },
          data: () => ({ visibility: 1 }),
        },
        before: { exists: true, data: () => ({ visibility: 1 }) },
      },
      db: { doc: jest.fn(() => variantRef) },
    });
    await utils.updateTreeVisibilityForVariantChange({
      change: {
        after: {
          ref: { path: 'variants/empty-parent' },
          data: () => ({ visibility: 1, incomingOption: 'options/o2' }),
        },
        before: { exists: false },
      },
      db: {
        doc: jest.fn(path =>
          path === 'options/o2'
            ? {
                parent: {
                  parent: {
                    get: jest.fn().mockResolvedValue({ data: () => undefined }),
                    update: jest.fn(),
                  },
                },
              }
            : {
                get: jest
                  .fn()
                  .mockResolvedValue({ exists: true, data: () => undefined }),
                update: jest.fn(),
              }
        ),
      },
    });
    const missingParentData = {
      get: jest.fn().mockResolvedValue({}),
      update: jest.fn(),
    };
    await utils.updateTreeVisibilityForVariantChange({
      change: {
        after: {
          ref: { path: 'variants/missing-parent-data' },
          data: () => ({ visibility: 1, incomingOption: 'options/o3' }),
        },
        before: { exists: false },
      },
      db: {
        doc: jest.fn(path =>
          path === 'options/o3'
            ? { parent: { parent: missingParentData } }
            : {
                get: jest
                  .fn()
                  .mockResolvedValue({ exists: true, data: () => ({}) }),
                update: jest.fn(),
              }
        ),
      },
    });
    const nullParentData = {
      get: jest.fn().mockResolvedValue({ data: null }),
      update: jest.fn(),
    };
    await utils.updateTreeVisibilityForVariantChange({
      change: {
        after: {
          ref: { path: 'variants/null-parent-data' },
          data: () => ({ visibility: 1, incomingOption: 'options/o4' }),
        },
        before: { exists: false },
      },
      db: {
        doc: jest.fn(path =>
          path === 'options/o4'
            ? { parent: { parent: nullParentData } }
            : {
                get: jest
                  .fn()
                  .mockResolvedValue({ exists: true, data: () => ({}) }),
                update: jest.fn(),
              }
        ),
      },
    });
    expect(
      utils.buildOptionsItems({
        pageNumber: 1,
        variantName: 'a',
        rewriteTargetPageNumbers: [7],
        options: [{ position: 0, content: 'next', targetPageNumber: 7 }],
      })
    ).toContain('../new-page.html?page=7');
  });

  test('clears the rendered variant tree-weight dirty marker', async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    const variantsRef = {
      get: jest.fn().mockResolvedValue({ docs: [] }),
    };
    const snapRef = {
      path: 'stories/s1/pages/1/variants/v1',
      parent: variantsRef,
      update,
    };
    const snap = { ref: snapRef };
    const save = jest.fn().mockResolvedValue(undefined);
    const invalidatePaths = jest.fn().mockResolvedValue(undefined);
    await renderVariantCoreTestUtils.persistRenderPlan({
      snap,
      context: undefined,
      db: {
        doc: jest.fn(() => snapRef),
        collection: jest.fn(path =>
          path === variantsRef.path ? variantsRef : variantsRef
        ),
      },
      bucket: { file: jest.fn(() => ({ save })) },
      invalidatePaths,
      variant: {},
      page: { number: 1 },
      parentUrl: undefined,
      html: '<html />',
      filePath: 'p/1.html',
      openVariant: false,
      reverseLinks: [],
    });
    expect(update).toHaveBeenCalledWith({ targetTreeWeightsDirty: false });
    expect(invalidatePaths).toHaveBeenCalledWith([
      '/p/1-alts.html',
      '/p/1.html',
    ]);
  });
});
