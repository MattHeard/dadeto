import {
  addTreeVisibilityDelta,
  calculateTreeVisibilitySum,
  changedByTreeWeightThreshold,
  getVisibilityDelta,
  resolveVariantVisibility,
  TREE_WEIGHT_DIRTY_THRESHOLD,
} from '../../../../src/core/cloud/tree-visibility/tree-visibility-core.js';

describe('tree visibility', () => {
  test('defaults missing visibility to one', () => {
    expect(resolveVariantVisibility({})).toBe(1);
    expect(resolveVariantVisibility()).toBe(1);
    expect(calculateTreeVisibilitySum(0.7)).toBe(0.7);
    expect(calculateTreeVisibilitySum(0.7, undefined)).toBe(0.7);
  });

  test('includes the root and all descendant variant sums', () => {
    expect(calculateTreeVisibilitySum(0.8, [0.7, 0.5, null])).toBe(2);
    expect(calculateTreeVisibilitySum(undefined, [0.2, 0.3])).toBe(1.5);
  });

  test('calculates visibility deltas with defaults', () => {
    expect(getVisibilityDelta({}, { visibility: 0.4 })).toBe(-0.6);
    expect(getVisibilityDelta()).toBe(0);
    expect(addTreeVisibilityDelta({ treeVisibilitySum: 2 }, 0.5)).toBe(2.5);
    expect(addTreeVisibilityDelta({ visibility: 0.5 }, 0.5)).toBe(1);
  });

  test('uses the exact five percent threshold', () => {
    expect(TREE_WEIGHT_DIRTY_THRESHOLD).toBe(0.05);
    expect(changedByTreeWeightThreshold(100, 100)).toBe(false);
    expect(changedByTreeWeightThreshold(100, 104.99)).toBe(false);
    expect(changedByTreeWeightThreshold(100, 105)).toBe(true);
    expect(changedByTreeWeightThreshold(100, 95)).toBe(true);
    expect(changedByTreeWeightThreshold(0, 0.01)).toBe(true);
  });
});
