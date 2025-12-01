import { jest } from '@jest/globals';
import {
  incrementVariantName,
  findAvailablePageNumber,
  createProcessNewPageHandler,
  resolveVariantDocumentId,
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

  it('fails fast when a random generator is missing', async () => {
    await expect(
      findAvailablePageNumber({} /* db never used */, 'not-a-function')
    ).rejects.toThrow('random must be a function');
  });
});

describe('resolveVariantDocumentId', () => {
  const randomUUID = jest.fn(() => 'random-id');

  afterEach(() => {
    randomUUID.mockClear();
  });

  it('returns the snapshot id when available', () => {
    const result = resolveVariantDocumentId({ id: 'existing-id' }, randomUUID);
    expect(result).toBe('existing-id');
    expect(randomUUID).not.toHaveBeenCalled();
  });

  it('falls back to the random generator when the snapshot is missing', () => {
    const result = resolveVariantDocumentId(undefined, randomUUID);
    expect(result).toBe('random-id');
    expect(randomUUID).toHaveBeenCalledTimes(1);
  });
});

/**
 * Create a mock Firestore batch for writes.
 * @returns {{set: jest.Mock, update: jest.Mock, commit: jest.Mock}} Batch helpers.
 */
function createBatch() {
  return {
    set: jest.fn(),
    update: jest.fn(),
    commit: jest.fn().mockResolvedValue(undefined),
  };
}

/**
 * Build a fake variants collection for hierarchy tests.
 * @param {{existingName: string|null, variantDoc: object}} root0 Arguments for the collection mock.
 * @param {string|null} root0.existingName Upgrade target name, if any.
 * @param {object} root0.variantDoc Variant document to expose.
 * @returns {{parent: null, orderBy: Function, doc: Function}} Mock collection API.
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
 * Build a variant document that tracks option fixtures.
 * @param {{optionDocs: object[]}} root0 Argument bundle for option doc tracking.
 * @param {object[]} root0.optionDocs Array that receives created option docs.
 * @returns {{id: string, path: string, parent: object|null, collection: Function}} Variant doc.
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
 * Create a fake story hierarchy with optional existing variant/page state.
 * @param {{existingVariantName?: string|null, optionDocs: object[], pageSnapshotNumber?: number}} root0 Configuration for the hierarchy.
 * @param {string|null} root0.existingVariantName Existing variant name to simulate.
 * @param {object[]} root0.optionDocs Mutable array for option documents.
 * @param {number|undefined} root0.pageSnapshotNumber Optional snapshot number for the current page.
 * @returns {{
 *   storyRef: object,
 *   pageDocRef: object,
 *   variantDoc: object,
 *   variantsCollection: object
 * }} Story hierarchy fixtures.
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
 * Create an author document mock.
 * @param {{exists: boolean}} root0 Author metadata.
 * @param {boolean} root0.exists Whether the doc should pretend to exist.
 * @returns {{id: string, path: string, get: jest.Mock}} Author document reference.
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

  it('returns early when the submission is already processed', async () => {
    const handler = createProcessNewPageHandler({
      db: { doc: jest.fn(), batch: jest.fn(() => createBatch()) },
      fieldValue,
      randomUUID: () => 'uuid',
      random: Math.random,
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
      random: Math.random,
    });

    await handler(snapshot);
    expect(snapshot.ref.update).toHaveBeenCalledWith({ processed: true });
  });

  it('creates a new variant for a direct page submission', async () => {
    const optionDocs = [];
    const { pageDocRef } = createStoryHierarchy({ optionDocs });

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

  it('does nothing when the author document already exists', async () => {
    const optionDocs = [];
    const { pageDocRef } = createStoryHierarchy({ optionDocs });
    const batch = createBatch();
    const authorDoc = createAuthorDoc({ exists: true });

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

    const handler = createProcessNewPageHandler({
      db,
      fieldValue,
      randomUUID: jest.fn().mockReturnValue('uuid'),
      random: jest.fn(() => 0.3),
    });

    const snapshot = {
      ref: { id: 'submission-xyz', update: jest.fn() },
      data: () => ({
        pageNumber: 5,
        processed: false,
        authorId: 'author-1',
        author: 'Author Name',
        content: 'Story content',
        options: ['Option X'],
      }),
    };

    await handler(snapshot);

    expect(authorDoc.get).toHaveBeenCalled();
    expect(batch.set).not.toHaveBeenCalledWith(authorDoc, expect.anything());
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

  it('marks incoming option submissions as processed when the option doc is missing', async () => {
    const optionRef = {
      get: jest.fn().mockResolvedValue({ exists: false }),
    };

    const db = {
      doc: jest.fn(path => {
        if (path === 'incoming/options/missing') {
          return optionRef;
        }
        throw new Error(`Unexpected doc path: ${path}`);
      }),
      batch: jest.fn(() => createBatch()),
    };

    const handler = createProcessNewPageHandler({
      db,
      fieldValue,
      randomUUID: jest.fn(() => 'uuid'),
      random: jest.fn(() => 0.15),
    });

    const snapshot = {
      ref: { update: jest.fn() },
      data: () => ({
        incomingOptionFullName: 'incoming/options/missing',
        processed: false,
      }),
    };

    await expect(handler(snapshot)).resolves.toBeNull();
    expect(optionRef.get).toHaveBeenCalled();
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

  it('reuses an existing target page when the snapshot lacks a page number', async () => {
    const optionDocs = [];
    const { storyRef, pageDocRef, variantDoc } = createStoryHierarchy({
      optionDocs,
    });

    pageDocRef.get = jest.fn().mockResolvedValue({
      exists: true,
      data: () => ({}),
    });

    const optionRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ targetPage: pageDocRef }),
      }),
      parent: { parent: variantDoc },
    };

    const batch = createBatch();
    const db = {
      doc: jest.fn(path => {
        if (path === 'incoming/options/existing-target') {
          return optionRef;
        }
        if (path.startsWith('storyStats/')) {
          return { path };
        }
        throw new Error(`Unexpected doc path: ${path}`);
      }),
      batch: jest.fn(() => batch),
      collectionGroup: jest.fn(() => ({
        where: jest.fn(() => ({
          limit: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
          })),
        })),
      })),
    };

    const handler = createProcessNewPageHandler({
      db,
      fieldValue,
      randomUUID: jest.fn(() => 'uuid'),
      random: jest.fn(() => 0.25),
    });

    const snapshot = {
      ref: { id: 'submission-999', update: jest.fn() },
      data: () => ({
        incomingOptionFullName: 'incoming/options/existing-target',
        processed: false,
        content: 'Keep existing',
        options: ['Option A'],
      }),
    };

    await expect(handler(snapshot)).resolves.toBeNull();

    expect(pageDocRef.get).toHaveBeenCalled();
    expect(storyRef.collection).not.toHaveBeenCalledWith('pages');
    expect(optionDocs).toHaveLength(1);
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
      collectionGroup: jest.fn(() => ({
        where: jest.fn(() => ({
          limit: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
          })),
        })),
      })),
    };

    const handler = createProcessNewPageHandler({
      db,
      fieldValue,
      randomUUID: jest.fn(() => 'generated'),
      random: jest.fn(() => 0.3),
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

  it('recovers when reading a target page fails by creating a replacement page', async () => {
    const optionDocs = [];
    const { storyRef, variantDoc } = createStoryHierarchy({
      optionDocs,
    });

    const createdPages = [];
    storyRef.collection.mockImplementation(name => {
      if (name !== 'pages') {
        throw new Error(`Unexpected collection request: ${name}`);
      }
      return {
        doc: jest.fn(id => {
          const newVariantDoc = createVariantDoc({ optionDocs });
          const newVariantsCollection = createVariantCollection({
            existingName: null,
            variantDoc: newVariantDoc,
          });

          const docRef = {
            id,
            path: `pages/${id}`,
            parent: { parent: storyRef },
            collection: jest.fn(collectionName => {
              if (collectionName !== 'variants') {
                throw new Error(
                  `Unexpected collection request: ${collectionName}`
                );
              }
              newVariantsCollection.parent = docRef;
              newVariantDoc.parent = newVariantsCollection;
              return newVariantsCollection;
            }),
          };

          createdPages.push(docRef);
          return docRef;
        }),
      };
    });

    const targetPage = {
      get: jest.fn().mockRejectedValue(new Error('unavailable')),
    };

    const optionRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ targetPage }),
      }),
      parent: { parent: variantDoc },
    };

    const batch = createBatch();
    const db = {
      doc: jest.fn(path => {
        if (path === 'incoming/options/error-target') {
          return optionRef;
        }
        if (path.startsWith('storyStats/')) {
          return { path };
        }
        throw new Error(`Unexpected doc path: ${path}`);
      }),
      batch: jest.fn(() => batch),
      collectionGroup: jest.fn(() => ({
        where: jest.fn(() => ({
          limit: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
          })),
        })),
      })),
    };

    const handler = createProcessNewPageHandler({
      db,
      fieldValue,
      randomUUID: jest.fn(() => 'generated'),
      random: jest.fn(() => 0.6),
    });

    const snapshot = {
      ref: { id: 'submission-111', update: jest.fn() },
      data: () => ({
        incomingOptionFullName: 'incoming/options/error-target',
        processed: false,
      }),
    };

    await handler(snapshot);

    expect(targetPage.get).toHaveBeenCalled();
    expect(batch.update).toHaveBeenCalledWith(optionRef, {
      targetPage: expect.objectContaining({ id: 'generated' }),
    });
    expect(createdPages).toHaveLength(1);
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

  it('increments variant names and falls back to randomUUID when snapshots lack identifiers', async () => {
    const optionDocs = [];
    const { pageDocRef, variantDoc } = createStoryHierarchy({
      existingVariantName: 'd',
      optionDocs,
      pageSnapshotNumber: 4,
    });

    const optionRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ targetPage: pageDocRef }),
      }),
      parent: { parent: variantDoc },
    };

    const batch = createBatch();

    const db = {
      doc: jest.fn(path => {
        if (path === 'incoming/options/preserved') {
          return optionRef;
        }
        if (path.startsWith('storyStats/')) {
          return { path };
        }
        throw new Error(`Unexpected doc path: ${path}`);
      }),
      batch: jest.fn(() => batch),
    };

    const randomUUID = jest.fn(() => 'generated-id');

    const handler = createProcessNewPageHandler({
      db,
      fieldValue,
      randomUUID,
      random: jest.fn(() => 0.75),
    });

    const snapshot = {
      ref: { update: jest.fn() },
      data: () => ({
        incomingOptionFullName: 'incoming/options/preserved',
        processed: false,
        content: 'Story text',
        options: 'not-an-array',
      }),
    };

    await handler(snapshot);

    const variantCall = batch.set.mock.calls.find(
      ([, payload]) =>
        payload && Object.prototype.hasOwnProperty.call(payload, 'name')
    );

    expect(variantCall?.[1].name).toBe('e');
    expect(variantCall?.[1].incomingOption).toBe('incoming/options/preserved');
    expect(randomUUID).toHaveBeenCalled();
    expect(optionDocs).toHaveLength(0);
  });
});
