import { propagateTreeVisibilityDelta } from '../../../../src/core/cloud/tree-visibility/tree-visibility-core.js';

/**
 *
 * @param name
 * @param parent
 * @param data
 */
/**
 * @param {string} name Reference name.
 * @param {object|null} parent Parent reference.
 * @param {object} data Stored data.
 * @returns {object} Firestore-like reference.
 */
function createRef(name, parent, data) {
  return {
    name,
    async get() {
      return { exists: true, data: () => data };
    },
    parent,
  };
}

test('propagates a delta through every ancestor and marks changed parents', async () => {
  const updates = [];
  const dirty = [];
  const root = createRef('root', null, { treeVisibilitySum: 10 });
  const parent = createRef('parent', root, { treeVisibilitySum: 2 });
  const child = createRef('child', parent, { treeVisibilitySum: 1 });

  await propagateTreeVisibilityDelta({
    variantRef: child,
    delta: 0.1,
    getParentVariantRef: async ref => ref.parent,
    updateVariant: async (ref, data) => updates.push([ref.name, data]),
    markParentDirty: async ref => dirty.push(ref.name),
  });

  expect(updates).toEqual([
    ['child', { treeVisibilitySum: 1.1 }],
    ['parent', { treeVisibilitySum: 2.1 }],
    ['root', { treeVisibilitySum: 10.1 }],
  ]);
  expect(dirty).toEqual(['child', 'parent']);
});
