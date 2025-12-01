import { jest } from '@jest/globals';
import {
  createProcessNewStoryHandler,
  setFindAvailablePageNumberResolver,
  resetFindAvailablePageNumberResolver,
  resolveContextSubId,
} from '../../../../src/core/cloud/process-new-story/process-new-story-core.js';

describe('resolveContextSubId', () => {
  it('returns undefined when context is missing', () => {
    expect(resolveContextSubId(undefined)).toBeUndefined();
  });

  it('returns undefined when params are missing', () => {
    expect(resolveContextSubId({})).toBeUndefined();
  });

  it('extracts the subId when provided in params', () => {
    expect(resolveContextSubId({ params: { subId: 'story-123' } })).toBe(
      'story-123'
    );
  });
});

/**
 * Build a fake Firestore database for story handler tests.
 * @param {{authorExists?: boolean}} root0 Configuration for author existence.
 * @param {boolean} [root0.authorExists] Controls whether author docs are marked as existing.
 * @returns {{db: {doc: Function, batch: Function}, getDoc: Function}} Test DB helpers.
 */
function createFakeDb({ authorExists = true } = {}) {
  const cache = new Map();

  const getDoc = path => {
    if (!cache.has(path)) {
      const collections = new Map();
      const docRef = {
        path,
        collection: jest.fn(collectionName => {
          if (!collections.has(collectionName)) {
            collections.set(collectionName, {
              doc: jest.fn(id => getDoc(`${path}/${collectionName}/${id}`)),
            });
          }

          return collections.get(collectionName);
        }),
        get: jest.fn(),
      };

      if (path.startsWith('authors/')) {
        docRef.get.mockResolvedValue({ exists: authorExists });
      }

      cache.set(path, docRef);
    }

    return cache.get(path);
  };

  return {
    db: {
      doc: jest.fn(path => getDoc(path)),
      batch: jest.fn(() => ({
        set: jest.fn(),
        update: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined),
      })),
    },
    getDoc,
  };
}

describe('createProcessNewStoryHandler', () => {
  const baseFieldValue = {
    serverTimestamp: jest.fn(() => 'ts'),
    increment: jest.fn(() => 'inc'),
  };

  afterEach(() => {
    resetFindAvailablePageNumberResolver();
    jest.clearAllMocks();
  });

  it('returns early when the submission is already processed', async () => {
    const { db } = createFakeDb();
    const randomUUID = jest.fn(() => 'id');
    const findAvailablePageNumberFn = jest.fn().mockResolvedValue(1);
    setFindAvailablePageNumberResolver(findAvailablePageNumberFn);

    const handler = createProcessNewStoryHandler({
      db,
      fieldValue: baseFieldValue,
      randomUUID,
    });

    const snapshot = {
      data: () => ({ processed: true }),
    };

    await expect(handler(snapshot, {})).resolves.toBeNull();
    expect(findAvailablePageNumberFn).not.toHaveBeenCalled();
    expect(db.batch).not.toHaveBeenCalled();
  });

  it('processes a new submission using context identifiers', async () => {
    const { db, getDoc } = createFakeDb({ authorExists: false });
    const random = jest.fn(() => 0.42);
    const randomUUID = jest
      .fn()
      .mockReturnValueOnce('page-id')
      .mockReturnValueOnce('variant-id')
      .mockReturnValueOnce('option-1')
      .mockReturnValueOnce('option-2')
      .mockReturnValueOnce('author-uuid');
    const findAvailablePageNumberFn = jest.fn().mockResolvedValue(87);
    setFindAvailablePageNumberResolver(findAvailablePageNumberFn);
    const fieldValue = {
      serverTimestamp: jest.fn(() => 'timestamp'),
      increment: jest.fn(() => 'increment'),
    };

    const handler = createProcessNewStoryHandler({
      db,
      fieldValue,
      randomUUID,
      random,
    });

    const submission = {
      processed: false,
      title: 'Story Title',
      content: 'Story body',
      author: 'Author Name',
      authorId: 'author-123',
      options: ['Option A', 'Option B'],
    };
    const snapshotRef = getDoc('submissions/story-sub');
    const snapshot = {
      data: () => submission,
      id: 'snapshot-id',
      ref: snapshotRef,
    };
    const context = { params: { subId: 'context-story' } };

    await expect(handler(snapshot, context)).resolves.toBeNull();

    expect(findAvailablePageNumberFn).toHaveBeenCalledWith(db, random);
    expect(db.doc).toHaveBeenCalledWith('stories/context-story');

    const batch = db.batch.mock.results[0].value;

    expect(batch.set).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'stories/context-story' }),
      expect.objectContaining({
        title: 'Story Title',
        createdAt: 'timestamp',
        rootPage: expect.objectContaining({
          path: expect.stringContaining('pages/'),
        }),
      })
    );

    expect(batch.set).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.stringContaining('/variants/variant-id'),
      }),
      expect.objectContaining({
        content: 'Story body',
        authorName: 'Author Name',
        moderatorReputationSum: 0,
        rand: 0.42,
      })
    );

    expect(
      batch.set.mock.calls.filter(([, data]) => data.position === 0)[0][1]
    ).toMatchObject({ content: 'Option A', position: 0 });
    expect(
      batch.set.mock.calls.filter(([, data]) => data.position === 1)[0][1]
    ).toMatchObject({ content: 'Option B', position: 1 });

    expect(batch.set).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'storyStats/context-story' }),
      { variantCount: 1 }
    );
    expect(batch.set).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'authors/author-123' }),
      { uuid: 'author-uuid' }
    );

    expect(batch.update).toHaveBeenCalledWith(snapshotRef, { processed: true });
    expect(batch.commit).toHaveBeenCalled();
  });

  it('handles missing snapshots and defaults context quietly', async () => {
    const { db } = createFakeDb();
    const findAvailablePageNumberFn = jest.fn().mockResolvedValue(5);
    setFindAvailablePageNumberResolver(findAvailablePageNumberFn);
    const randomUUID = jest
      .fn()
      .mockReturnValueOnce('story-id')
      .mockReturnValueOnce('page-id')
      .mockReturnValueOnce('variant-id');
    const random = jest.fn(() => 0.2);

    const handler = createProcessNewStoryHandler({
      db,
      fieldValue: baseFieldValue,
      randomUUID,
      random,
    });

    await expect(handler(null)).resolves.toBeNull();

    expect(findAvailablePageNumberFn).toHaveBeenCalledWith(db, random);
    expect(db.doc).toHaveBeenCalledWith('stories/story-id');
    expect(randomUUID).toHaveBeenCalledTimes(3);
  });

  it('uses the snapshot identifier when context parameters are missing', async () => {
    const { db, getDoc } = createFakeDb({ authorExists: true });
    const randomUUID = jest
      .fn()
      .mockReturnValueOnce('page-id')
      .mockReturnValueOnce('variant-id');
    const findAvailablePageNumberFn = jest.fn().mockResolvedValue(11);
    setFindAvailablePageNumberResolver(findAvailablePageNumberFn);

    const handler = createProcessNewStoryHandler({
      db,
      fieldValue: baseFieldValue,
      randomUUID,
    });

    const submission = {
      title: 'Another story',
      content: 'Body',
      options: 'invalid-type',
      authorId: 'author-existing',
    };
    const snapshotRef = getDoc('submissions/story-two');
    const snapshot = {
      data: () => submission,
      id: 'snapshot-story',
      ref: snapshotRef,
    };

    await handler(snapshot, {});

    const batch = db.batch.mock.results[0].value;
    expect(findAvailablePageNumberFn).toHaveBeenCalledWith(db, Math.random);
    expect(db.doc).toHaveBeenCalledWith('stories/snapshot-story');
    expect(batch.set.mock.calls.some(([, data]) => data.position === 0)).toBe(
      false
    );
    expect(
      batch.set.mock.calls.some(([ref]) => ref.path.startsWith('authors/'))
    ).toBe(false);
    expect(batch.update).toHaveBeenCalledWith(snapshotRef, { processed: true });
  });

  it('falls back to a random identifier when none are provided', async () => {
    const { db, getDoc } = createFakeDb();
    const randomUUID = jest
      .fn()
      .mockReturnValueOnce('generated-story')
      .mockReturnValueOnce('page-id')
      .mockReturnValueOnce('variant-id');
    const findAvailablePageNumberFn = jest.fn().mockResolvedValue(5);
    setFindAvailablePageNumberResolver(findAvailablePageNumberFn);

    const handler = createProcessNewStoryHandler({
      db,
      fieldValue: baseFieldValue,
      randomUUID,
    });

    const snapshotRef = getDoc('submissions/random-story');
    const snapshot = {
      data: () => ({ title: 'Untitled', content: '...' }),
      id: '',
      ref: snapshotRef,
    };

    await handler(snapshot, {});

    expect(findAvailablePageNumberFn).toHaveBeenCalledWith(db, Math.random);
    expect(db.doc).toHaveBeenCalledWith('stories/generated-story');
    expect(randomUUID).toHaveBeenCalledTimes(3);
  });
});
