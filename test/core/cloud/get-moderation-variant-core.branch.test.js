import { getModerationVariantTestUtils } from '../../../src/core/cloud/get-moderation-variant/get-moderation-variant-core.js';

describe('getModerationVariantTestUtils', () => {
  test('getAuthorizationHeader returns null when getter missing', () => {
    expect(getModerationVariantTestUtils.getAuthorizationHeader({})).toBeNull();
  });

  test('resolveTokenFromRequest returns empty string for missing header', () => {
    expect(
      getModerationVariantTestUtils.resolveTokenFromRequest({ get: () => null })
    ).toBe('');
  });

  test('resolveVariantFromData returns null when undefined', () => {
    expect(
      getModerationVariantTestUtils.resolveVariantFromData(undefined)
    ).toBeNull();
  });

  test('extractPageFromVariant handles missing parent', () => {
    expect(getModerationVariantTestUtils.extractPageFromVariant({})).toBeNull();
  });

  test('resolveStoryRefFromVariant returns null for incomplete chain', () => {
    const variantRef = { parent: { parent: null } };
    expect(
      getModerationVariantTestUtils.resolveStoryRefFromVariant(variantRef)
    ).toBeNull();
  });

  test('extractStoryDataFromSnapshot returns empty object when data missing', () => {
    const storySnap = { data: () => null };
    expect(
      getModerationVariantTestUtils.extractStoryDataFromSnapshot(storySnap)
    ).toEqual({});
  });

  test('handleVariantSnapshotResponse returns error response when status present', async () => {
    const result =
      await getModerationVariantTestUtils.handleVariantSnapshotResponse({
        status: 418,
        body: {},
      });
    expect(result.status).toBe(418);
  });

  /**
   * Create a variant snapshot double.
   * @param {object} [root0] - Optional configuration.
   * @param {object | null} [root0.variantData] - Variant data payload returned by snapshot.
   * @param {string | null} [root0.storyTitle] - Story title resolved through parent refs.
   * @returns {{data: () => (object | null), ref: object}} Snapshot double.
   */
  function createVariantSnapshot({
    variantData = null,
    storyTitle = null,
  } = {}) {
    const storyRef = storyTitle
      ? {
          get: async () => ({ data: () => ({ title: storyTitle }) }),
        }
      : null;
    const storyParent = { parent: storyRef };
    const pageRef = { parent: storyParent };
    const collectionRef = { parent: pageRef };
    const variantRef = {
      parent: collectionRef,
      collection() {
        return {
          get: async () => ({ docs: [] }),
        };
      },
    };

    return {
      variantSnap: {
        data: () => variantData,
      },
      variantRef,
    };
  }

  test('handles variant snapshot without story reference and data', async () => {
    const snapshot = createVariantSnapshot();
    const result =
      await getModerationVariantTestUtils.handleVariantSnapshotResponse(
        snapshot
      );

    expect(result.status).toBe(200);
    expect(result.body.title).toBe('');
    expect(result.body.content).toBe('');
  });

  test('loads story title and variant data when available', async () => {
    const snapshot = createVariantSnapshot({
      variantData: { content: 'body', author: 'author' },
      storyTitle: 'Story Name',
    });

    const result =
      await getModerationVariantTestUtils.handleVariantSnapshotResponse(
        snapshot
      );

    expect(result.body.title).toBe('Story Name');
    expect(result.body.content).toBe('body');
    expect(result.body.author).toBe('author');
  });
});
