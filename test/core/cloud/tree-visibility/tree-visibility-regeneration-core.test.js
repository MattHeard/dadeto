import { jest } from '@jest/globals';
import {
  migrateTreeVisibilitySums,
  regenerateDirtyTreeWeightVariants,
} from '../../../../src/core/cloud/tree-visibility/tree-visibility-regeneration-core.js';

test('regenerates only dirty variants and continues after failures', async () => {
  const first = { ref: { path: 'a' } };
  const second = { ref: { path: 'b' } };
  const renderVariant = jest
    .fn()
    .mockResolvedValueOnce(undefined)
    .mockRejectedValueOnce(new Error('nope'));
  const consoleError = jest.fn();
  const result = await regenerateDirtyTreeWeightVariants({
    db: {
      collectionGroup: () => ({
        where: () => ({ get: async () => ({ docs: [first, second] }) }),
      }),
    },
    renderVariant,
    consoleError,
  });
  expect(result).toEqual({ processed: 1, failed: 1 });
  expect(renderVariant).toHaveBeenCalledTimes(2);
  expect(consoleError).toHaveBeenCalled();
});

test('migration calculates sums bottom-up and is rerunnable', async () => {
  const leaf = { data: { visibility: 0.5 } };
  const root = { data: { visibility: 0.8 } };
  const writes = [];
  const readChildren = async node => (node === root ? [leaf] : []);
  const options = {
    stories: [{ id: 'story' }],
    readChildren: async node =>
      node.id === 'story' ? [root] : readChildren(node),
    writeVariant: async (variant, data) => writes.push([variant, data]),
  };
  await migrateTreeVisibilitySums(options);
  expect(writes).toEqual([
    [leaf, { treeVisibilitySum: 0.5 }],
    [root, { treeVisibilitySum: 1.3, targetTreeWeightsDirty: true }],
  ]);
});
