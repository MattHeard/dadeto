import { jest } from '@jest/globals';
import {
  incrementVariantName,
  findAvailablePageNumber,
  createProcessNewPageHandler,
} from '../../../../src/core/cloud/process-new-page/process-new-page-core.js';

describe('incrementVariantName', () => {
  it('defaults to a when the input is invalid', () => {
    expect(incrementVariantName(undefined)).toBe('a');
    expect(incrementVariantName('')).toBe('a');
  });

  it('increments alphabetic characters', () => {
    expect(incrementVariantName('a')).toBe('b');
  });

  it('carries over when the string is all z', () => {
    expect(incrementVariantName('zz')).toBe('aaa');
  });
});

describe('findAvailablePageNumber', () => {
  it('returns the candidate when no pages exist', async () => {
    const db = {
      collectionGroup: jest.fn(() => ({
        where: jest.fn(() => ({
          limit: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({ empty: true }),
          })),
        })),
      })),
    };

    const random = jest.fn(() => 0.4); // candidate becomes 1

    await expect(findAvailablePageNumber(db, random)).resolves.toBe(1);
    expect(db.collectionGroup).toHaveBeenCalledWith('pages');
  });

  it('recurses when the candidate already exists', async () => {
    const secondQuery = {
      where: jest.fn(() => ({
        limit: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({
            empty: true,
          }),
        })),
      })),
    };

    const db = {
      collectionGroup: jest
        .fn()
        .mockImplementationOnce(() => ({
          where: jest.fn(() => ({
            limit: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({ empty: false }),
            })),
          })),
        }))
        .mockImplementation(() => secondQuery),
    };

    const random = jest.fn().mockReturnValue(0.7);

    await expect(findAvailablePageNumber(db, random)).resolves.toBe(2);
    expect(db.collectionGroup).toHaveBeenCalledTimes(2);
  });
});

/**
 *
 */
function createBatch() {
  return {
    set: jest.fn(),
    update: jest.fn(),
    commit: jest.fn().mockResolvedValue(undefined),
  };
}

/**
 *
 * @param root0
 * @param root0.existingName
 * @param root0.variantDoc
 */
function createVariantCollection({ existingName = null, variantDoc }) {
  return {
    parent: null,
    orderBy: jest.fn(() => ({
      limit: jest.fn(() => ({
        get: jest.fn().mockResolvedValue(
          existingName === null
            ? { empty: true, docs: [] }
            : {
                empty: false,
                docs: [
                  {
                    data: () => ({ name: existingName }),
                  },
                ],
              }
        ),
      })),
    })),
    doc: jest.fn(() => variantDoc),
  };
}

/**
 *
 * @param root0
 * @param root0.optionDocs
 */
function createVariantDoc({ optionDocs }) {
  const variantDoc = {
    id: 'variant-doc',
    path: 'variants/variant-doc',
    parent: null,
    collection: jest.fn(() => ({
      doc: jest.fn(id => {
        const optionDoc = { id, path: `variants/variant-doc/options/${id}` };
        optionDocs.push(optionDoc);
        return optionDoc;
      }),
    })),
  };

  return variantDoc;
}

/**
 *
 * @param root0
 * @param root0.existingVariantName
 * @param root0.optionDocs
 * @param root0.pageSnapshotNumber
 */
function createStoryHierarchy({
  existingVariantName = null,
  optionDocs,
  pageSnapshotNumber,
}) {
  const storyRef = {
    id: 'story-123',
    collection: jest.fn(() => ({ doc: jest.fn() })),
  };

  const variantDoc = createVariantDoc({ optionDocs });
  const variantsCollection = createVariantCollection({
    existingName: existingVariantName,
    variantDoc,
  });

  const pageDocRef = {
    collection: jest.fn(name => {
      if (name === 'variants') {
        return variantsCollection;
      }
      throw new Error(`Unexpected collection request: ${name}`);
    }),
    parent: { parent: storyRef },
  };

  if (typeof pageSnapshotNumber === 'number') {
    pageDocRef.get = jest.fn().mockResolvedValue({
      exists: true,
      data: () => ({ number: pageSnapshotNumber }),
    });
  }

  variantsCollection.parent = pageDocRef;
  variantDoc.parent = variantsCollection;

  return { storyRef, pageDocRef, variantDoc, variantsCollection };
}

/**
 *
 * @param root0
 * @param root0.exists
 */
function createAuthorDoc({ exists }) {
  return {
    id: 'author-1',
    path: 'authors/author-1',
    get: jest.fn().mockResolvedValue({ exists }),
  };
}

describe('createProcessNewPageHandler', () => {
  const fieldValue = {
    serverTimestamp: jest.fn(() => 'ts'),
    increment: jest.fn(value => `inc:${value}`),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('validates dependencies before creating the handler', () => {
    expect(() =>
      createProcessNewPageHandler({
        db: null,
        fieldValue,
        randomUUID: () => 'uuid',
      })
    ).toThrow(new TypeError('db must provide doc and batch helpers'));

    expect(() =>
      createProcessNewPageHandler({
        db: { doc: jest.fn(), batch: jest.fn() },
        fieldValue: { increment: () => {} },
        randomUUID: () => 'uuid',
      })
    ).toThrow(new TypeError('fieldValue.serverTimestamp must be a function'));

    expect(() =>
      createProcessNewPageHandler({
        db: { doc: jest.fn(), batch: jest.fn() },
        fieldValue: { serverTimestamp: () => {} },
        randomUUID: () => 'uuid',
      })
    ).toThrow(new TypeError('fieldValue.increment must be a function'));

    expect(() =>
      createProcessNewPageHandler({
        db: { doc: jest.fn(), batch: jest.fn() },
        fieldValue,
        randomUUID: null,
      })
    ).toThrow(new TypeError('randomUUID must be a function'));

    expect(() =>
      createProcessNewPageHandler({
        db: { doc: jest.fn(), batch: jest.fn() },
        fieldValue,
        randomUUID: () => 'uuid',
        random: null,
      })
    ).toThrow(new TypeError('random must be a function'));

    expect(() =>
      createProcessNewPageHandler({
        db: { doc: jest.fn(), batch: jest.fn() },
        fieldValue,
        randomUUID: () => 'uuid',
        findAvailablePageNumberFn: null,
      })
    ).toThrow(new TypeError('findAvailablePageNumber must be a function'));

    expect(() =>
      createProcessNewPageHandler({
        db: { doc: jest.fn(), batch: jest.fn() },
        fieldValue,
        randomUUID: () => 'uuid',
        incrementVariantNameFn: null,
      })
    ).toThrow(new TypeError('incrementVariantName must be a function'));
  });

  it('returns early when the submission is already processed', async () => {
    const handler = createProcessNewPageHandler({
      db: { doc: jest.fn(), batch: jest.fn(() => createBatch()) },
      fieldValue,
      randomUUID: () => 'uuid',
    });

    const snapshot = { data: () => ({ processed: true }) };

    await expect(handler(snapshot)).resolves.toBeNull();
  });

  it('marks submissions as processed when missing page context', async () => {
    const snapshot = {
      ref: { update: jest.fn() },
      data: () => ({ processed: false }),
    };

    const handler = createProcessNewPageHandler({
      db: {
        doc: jest.fn(),
        batch: jest.fn(() => createBatch()),
      },
      fieldValue,
      randomUUID: () => 'uuid',
    });

    await handler(snapshot);
    expect(snapshot.ref.update).toHaveBeenCalledWith({ processed: true });
  });

  it('returns gracefully when the snapshot is unavailable', async () => {
    const handler = createProcessNewPageHandler({
      db: {
        doc: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({ exists: false }),
        })),
        batch: jest.fn(() => createBatch()),
      },
      fieldValue,
      randomUUID: () => 'uuid',
    });

    await expect(handler(null)).resolves.toBeNull();
  });

  it('creates a new variant for a direct page submission', async () => {
    const optionDocs = [];
    const { pageDocRef, storyRef } = createStoryHierarchy({ optionDocs });

    const batch = createBatch();

    const authorDoc = createAuthorDoc({ exists: false });

    const db = {
      doc: jest.fn(path => {
        if (path.startsWith('storyStats/')) {
          return { path };
        }
        if (path.startsWith('authors/')) {
          return authorDoc;
        }
        throw new Error(`Unexpected doc path: ${path}`);
      }),
      batch: jest.fn(() => batch),
      collectionGroup: jest.fn(() => ({
        where: jest.fn(() => ({
          limit: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({
              empty: false,
              docs: [{ ref: pageDocRef }],
            }),
          })),
        })),
      })),
    };

    const randomUUID = jest
      .fn()
      .mockReturnValueOnce('option-1')
      .mockReturnValueOnce('option-2')
      .mockReturnValue('uuid-fallback');

    const handler = createProcessNewPageHandler({
      db,
      fieldValue,
      randomUUID,
      random: jest.fn(() => 0.25),
    });

    const snapshot = {
      ref: { id: 'submission-123', update: jest.fn() },
      data: () => ({
        pageNumber: 5,
        processed: false,
        authorId: 'author-1',
        author: 'Author Name',
        content: 'Story content',
        options: ['Option A', 'Option B'],
      }),
    };

    await handler(snapshot);

    expect(batch.set).toHaveBeenCalled();
    expect(batch.update).toHaveBeenCalledWith(snapshot.ref, {
      processed: true,
    });
    expect(db.doc).toHaveBeenCalledWith('storyStats/story-123');
    expect(authorDoc.get).toHaveBeenCalled();
    expect(batch.set).toHaveBeenCalledWith(authorDoc, {
      uuid: 'uuid-fallback',
    });
    expect(batch.commit).toHaveBeenCalled();
    expect(optionDocs).toHaveLength(2);
  });

  it('marks direct page submissions as processed when no match is found', async () => {
    const batch = createBatch();
    const db = {
      doc: jest.fn(path => {
        if (path.startsWith('storyStats/')) {
          return { path };
        }
        throw new Error(`Unexpected doc path: ${path}`);
      }),
      batch: jest.fn(() => batch),
      collectionGroup: jest.fn(() => ({
        where: jest.fn(() => ({
          limit: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({ empty: true }),
          })),
        })),
      })),
    };

    const handler = createProcessNewPageHandler({
      db,
      fieldValue,
      randomUUID: () => 'uuid',
      random: jest.fn(() => 0.5),
    });

    const snapshot = {
      ref: { update: jest.fn() },
      data: () => ({ pageNumber: 42, processed: false }),
    };

    await expect(handler(snapshot)).resolves.toBeNull();
    expect(snapshot.ref.update).toHaveBeenCalledWith({ processed: true });
  });

  it('updates existing option submissions by reusing the target page', async () => {
    const optionDocs = [];
    const { pageDocRef, variantDoc } = createStoryHierarchy({
      optionDocs,
      pageSnapshotNumber: 9,
    });

    const variantRef = Object.assign(variantDoc, {
      update: jest.fn(),
    });

    const optionCollection = { parent: variantRef };
    const optionRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ targetPage: pageDocRef }),
      }),
      parent: optionCollection,
    };

    const batch = createBatch();
    const authorDoc = createAuthorDoc({ exists: true });

    const db = {
      doc: jest.fn(path => {
        if (path === 'incoming/options/opt') {
          return optionRef;
        }
        if (path.startsWith('storyStats/')) {
          return { path };
        }
        if (path.startsWith('authors/')) {
          return authorDoc;
        }
        throw new Error(`Unexpected doc path: ${path}`);
      }),
      batch: jest.fn(() => batch),
    };

    const handler = createProcessNewPageHandler({
      db,
      fieldValue,
      randomUUID: jest.fn(() => 'uuid'),
      random: jest.fn(() => 0.1),
    });

    const snapshot = {
      ref: { id: 'submission-456', update: jest.fn() },
      data: () => ({
        incomingOptionFullName: 'incoming/options/opt',
        processed: false,
        content: 'More content',
      }),
    };

    await handler(snapshot);

    expect(optionRef.get).toHaveBeenCalled();
    expect(pageDocRef.get).toHaveBeenCalled();
    expect(batch.update).toHaveBeenCalledWith(variantRef, { dirty: null });
    expect(batch.commit).toHaveBeenCalled();
  });

  it('creates a page when option submissions lack a target page', async () => {
    const optionDocs = [];
    const { storyRef, pageDocRef, variantDoc, variantsCollection } =
      createStoryHierarchy({ optionDocs });

    const createdPages = [];
    const pageCollection = {
      doc: jest.fn(id => {
        const variantDoc = createVariantDoc({ optionDocs });
        const variantsCollection = createVariantCollection({
          existingName: null,
          variantDoc,
        });

        const docRef = {
          id,
          path: `pages/${id}`,
          parent: { parent: storyRef },
          collection: jest.fn(name => {
            if (name === 'variants') {
              variantsCollection.parent = docRef;
              variantDoc.parent = variantsCollection;
              return variantsCollection;
            }
            throw new Error(`Unexpected collection request: ${name}`);
          }),
        };

        createdPages.push(docRef);
        return docRef;
      }),
    };

    storyRef.collection.mockReturnValue(pageCollection);

    const optionRef = {
      get: jest.fn().mockResolvedValue({ exists: true, data: () => ({}) }),
      parent: {
        parent: variantDoc,
      },
    };

    variantsCollection.parent = pageDocRef;
    pageDocRef.parent = { parent: storyRef };

    const db = {
      doc: jest.fn(path => {
        if (path === 'incoming/options/opt-two') {
          return optionRef;
        }
        if (path.startsWith('storyStats/')) {
          return { path };
        }
        throw new Error(`Unexpected doc path: ${path}`);
      }),
      batch: jest.fn(() => createBatch()),
    };

    const handler = createProcessNewPageHandler({
      db,
      fieldValue,
      randomUUID: jest.fn(() => 'generated'),
      random: jest.fn(() => 0.3),
      findAvailablePageNumberFn: jest.fn(() => Promise.resolve(7)),
    });

    const snapshot = {
      ref: { id: 'submission-789', update: jest.fn() },
      data: () => ({
        incomingOptionFullName: 'incoming/options/opt-two',
        processed: false,
        options: ['Keep original'],
        author: 'Writer',
      }),
    };

    await handler(snapshot);

    expect(createdPages).toHaveLength(1);
    expect(storyRef.collection).toHaveBeenCalledWith('pages');
  });

  it('throws when the resolved page reference lacks a collection helper', async () => {
    const db = {
      doc: jest.fn(path => {
        if (path.startsWith('storyStats/')) {
          return { path };
        }
        throw new Error(`Unexpected doc request: ${path}`);
      }),
      batch: jest.fn(() => createBatch()),
      collectionGroup: jest.fn(() => ({
        where: jest.fn(() => ({
          limit: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({
              empty: false,
              docs: [
                {
                  ref: {
                    parent: {
                      parent: {
                        collection: jest.fn(() => ({ doc: jest.fn() })),
                      },
                    },
                  },
                },
              ],
            }),
          })),
        })),
      })),
    };

    const handler = createProcessNewPageHandler({
      db,
      fieldValue,
      randomUUID: () => 'uuid',
      random: jest.fn(() => 0.2),
    });

    const snapshot = {
      ref: { update: jest.fn() },
      data: () => ({ pageNumber: 8, processed: false }),
    };

    await expect(handler(snapshot)).rejects.toEqual(
      new TypeError('pageDocRef.collection must be a function')
    );
  });
});
