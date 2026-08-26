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
  const where = jest.fn(() => ({ get: async () => ({ docs: [first, second] }) }));
  const collectionGroup = jest.fn(() => ({ where }));
  const result = await regenerateDirtyTreeWeightVariants({
    db: {
      collectionGroup,
    },
    renderVariant,
    consoleError,
  });
  expect(result).toEqual({ processed: 1, failed: 1 });
  expect(collectionGroup).toHaveBeenCalledWith('variants');
  expect(where).toHaveBeenCalledWith('targetTreeWeightsDirty', '==', true);
  expect(renderVariant).toHaveBeenCalledTimes(2);
  expect(consoleError).toHaveBeenCalledWith(
    'tree-weight regeneration failed',
    'b',
    expect.any(Error)
  );
});

test('uses the default error logger and handles an empty dirty snapshot', async () => {
  await expect(
    regenerateDirtyTreeWeightVariants({
      db: {
        collectionGroup: () => ({
          where: () => ({ get: async () => ({}) }),
        }),
      },
      renderVariant: jest.fn(),
    })
  ).resolves.toEqual({ processed: 0, failed: 0 });

  await expect(
    regenerateDirtyTreeWeightVariants({
      db: {
        collectionGroup: () => ({
          where: () => ({
            get: async () => ({ docs: [{ ref: { path: 'broken' } }] }),
          }),
        }),
      },
      renderVariant: jest.fn().mockRejectedValue(new Error('broken')),
    })
  ).resolves.toEqual({ processed: 0, failed: 1 });
});

test('passes an undefined path when a failed variant has no reference', async () => {
  const consoleError = jest.fn();
  await expect(
    regenerateDirtyTreeWeightVariants({
      db: {
        collectionGroup: () => ({
          where: () => ({ get: async () => ({ docs: [{}] }) }),
        }),
      },
      renderVariant: jest.fn().mockRejectedValue(new Error('broken')),
      consoleError,
    })
  ).resolves.toEqual({ processed: 0, failed: 1 });

  expect(consoleError).toHaveBeenCalledWith(
    'tree-weight regeneration failed',
    undefined,
    expect.any(Error)
  );
});

test('migration calculates sums bottom-up and is rerunnable', async () => {
  const leaf = { data: { visibility: 0.5 } };
  const root = { data: { visibility: 0.8 } };
  const writes = [];
  const readChildren = async node => {
    if (node === root) return [leaf];
    return [];
  };
  const options = {
    stories: [{ id: 'story' }],
    readChildren: async node => {
      if (node.id === 'story') return [root];
      return readChildren(node);
    },
    writeVariant: async (variant, data) => writes.push([variant, data]),
  };
  await expect(migrateTreeVisibilitySums(options)).resolves.toBe(2);
  expect(writes).toEqual([
    [leaf, { treeVisibilitySum: 0.5 }],
    [root, { treeVisibilitySum: 1.3, targetTreeWeightsDirty: true }],
  ]);
});

test('migration defaults visibility when a variant has no data', async () => {
  const writes = [];
  await expect(migrateTreeVisibilitySums({
    stories: [{ id: 'story' }],
    readChildren: async node => {
      if (node.id === 'story') return [{ data: null }];
      return [];
    },
    writeVariant: async (variant, data) => writes.push([variant, data]),
  })).resolves.toBe(1);

  expect(writes).toEqual([[{ data: null }, { treeVisibilitySum: 1 }]]);
});
