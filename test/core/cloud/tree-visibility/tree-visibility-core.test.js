import { jest } from '@jest/globals';

import {
  addTreeVisibilityDelta,
  calculateTreeVisibilitySum,
  changedByTreeWeightThreshold,
  getVisibilityDelta,
  resolveVariantVisibility,
  TREE_WEIGHT_DIRTY_THRESHOLD,
  propagateTreeVisibilityDelta,
} from '../../../../src/core/cloud/tree-visibility/tree-visibility-core.js';

describe('tree visibility', () => {
  test('defaults missing visibility to one', () => {
    expect(resolveVariantVisibility({})).toBe(1);
    expect(resolveVariantVisibility()).toBe(1);
    expect(calculateTreeVisibilitySum(0.7)).toBe(0.7);
  });

  test('includes the root and all descendant variant sums', () => {
    expect(calculateTreeVisibilitySum(0.8, [0.7, 0.5])).toBe(2);
    expect(calculateTreeVisibilitySum(undefined, [0.2, 0.3])).toBe(1.5);
  });

  test('calculates visibility deltas with defaults', () => {
    expect(getVisibilityDelta()).toBe(0);
    expect(getVisibilityDelta({}, { visibility: 0.4 })).toBe(-0.6);
    expect(addTreeVisibilityDelta({ treeVisibilitySum: 2 }, 0.5)).toBe(2.5);
    expect(resolveVariantVisibility({ visibility: null })).toBe(1);
    expect(calculateTreeVisibilitySum(0.4, [null, undefined])).toBe(0.4);
    expect(getVisibilityDelta({ visibility: null }, { visibility: null })).toBe(
      0
    );
    expect(addTreeVisibilityDelta({}, 0.5)).toBe(1.5);
  });

  test('uses the exact five percent threshold', () => {
    expect(TREE_WEIGHT_DIRTY_THRESHOLD).toBe(0.05);
    expect(changedByTreeWeightThreshold(100, 100)).toBe(false);
    expect(changedByTreeWeightThreshold(100, 104.99)).toBe(false);
    expect(changedByTreeWeightThreshold(100, 105)).toBe(true);
    expect(changedByTreeWeightThreshold(100, 95)).toBe(true);
    expect(changedByTreeWeightThreshold(0, 0.01)).toBe(true);
  });

  test('propagates deltas through parents and stops at a missing snapshot', async () => {
    const root = { get: jest.fn() };
    const parent = { get: jest.fn() };
    root.get.mockResolvedValue({
      exists: true,
      data: () => ({ treeVisibilitySum: 1 }),
    });
    parent.get.mockResolvedValue({
      exists: true,
      data: () => ({ treeVisibilitySum: 10 }),
    });
    const updateVariant = jest.fn().mockResolvedValue(undefined);
    const markParentDirty = jest.fn().mockResolvedValue(undefined);
    const getParentVariantRef = jest
      .fn()
      .mockResolvedValueOnce(parent)
      .mockResolvedValueOnce(null);

    await propagateTreeVisibilityDelta({
      variantRef: root,
      delta: 0.1,
      getParentVariantRef,
      updateVariant,
      markParentDirty,
    });

    expect(updateVariant).toHaveBeenNthCalledWith(1, root, {
      treeVisibilitySum: 1.1,
    });
    expect(updateVariant).toHaveBeenNthCalledWith(2, parent, {
      treeVisibilitySum: 10.1,
    });
    expect(markParentDirty).toHaveBeenCalledTimes(1);

    const missing = { get: jest.fn().mockResolvedValue({ exists: false }) };
    await propagateTreeVisibilityDelta({
      variantRef: missing,
      delta: 1,
      getParentVariantRef,
      updateVariant,
      markParentDirty,
    });
    expect(updateVariant).toHaveBeenCalledTimes(2);

    const emptyData = {
      get: jest.fn().mockResolvedValue({ exists: true, data: () => null }),
    };
    await propagateTreeVisibilityDelta({
      variantRef: emptyData,
      delta: 0,
      getParentVariantRef: jest.fn().mockResolvedValue(null),
      updateVariant,
      markParentDirty,
    });
  });
});
