import { jest } from '@jest/globals';
import {
  createRenderVariant,
  createHandleVariantWrite,
  VISIBILITY_THRESHOLD,
  DEFAULT_BUCKET_NAME,
  getVisibleVariants,
} from '../../../../src/core/cloud/render-variant/render-variant-core.js';

describe('createRenderVariant', () => {
  it('validates required dependencies', () => {
    const storage = { bucket: jest.fn() };
    const fetchFn = jest.fn();
    const randomUUID = jest.fn();

    expect(() =>
      createRenderVariant({
        db: null,
        storage,
        fetchFn,
        randomUUID,
      })
    ).toThrow(new TypeError('db must provide a doc helper'));

    expect(() =>
      createRenderVariant({
        db: { doc: jest.fn() },
        storage: null,
        fetchFn,
        randomUUID,
      })
    ).toThrow(new TypeError('storage must provide a bucket helper'));

    expect(() =>
      createRenderVariant({
        db: { doc: jest.fn() },
        storage,
        fetchFn: null,
        randomUUID,
      })
    ).toThrow(new TypeError('fetchFn must be a function'));

    expect(() =>
      createRenderVariant({
        db: { doc: jest.fn() },
        storage,
        fetchFn,
        randomUUID: null,
      })
    ).toThrow(new TypeError('randomUUID must be a function'));
  });

  it('renders variants, writes artefacts, and invalidates caches', async () => {
    const consoleError = jest.fn();

    // Author document handling
    const authorFile = {
      exists: jest.fn().mockResolvedValue([false]),
      save: jest.fn().mockResolvedValue(undefined),
    };

    const variantFile = {
      save: jest.fn().mockResolvedValue(undefined),
    };
    const altsFile = {
      save: jest.fn().mockResolvedValue(undefined),
    };
    const pendingFile = {
      save: jest.fn().mockResolvedValue(undefined),
    };

    const bucketFile = jest.fn(path => {
      switch (path) {
        case 'p/5a.html':
          return variantFile;
        case 'p/5-alts.html':
          return altsFile;
        case 'pending/variant-xyz.json':
          return pendingFile;
        case 'a/auth-uuid.html':
          return authorFile;
        default:
          return {
            save: jest.fn().mockResolvedValue(undefined),
            exists: jest.fn().mockResolvedValue([true]),
          };
      }
    });

    const bucket = { file: bucketFile };
    const storage = {
      bucket: jest.fn(name => {
        expect(name).toBe(DEFAULT_BUCKET_NAME);
        return bucket;
      }),
    };

    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token' }),
      })
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

    const randomUUID = jest
      .fn()
      .mockReturnValueOnce('uuid-metadata')
      .mockReturnValue('uuid-request');

    // Mock Firestore hierarchy
    const parentVariantSnap = {
      exists: true,
      data: () => ({ name: 'b' }),
    };
    const parentPageSnap = {
      exists: true,
      data: () => ({ number: 88 }),
    };
    const parentPageRef = {
      get: jest.fn().mockResolvedValue(parentPageSnap),
    };
    const variantsCollectionRef = {
      parent: parentPageRef,
    };
    const parentVariantRef = {
      get: jest.fn().mockResolvedValue(parentVariantSnap),
      parent: variantsCollectionRef,
    };
    variantsCollectionRef.parent = parentPageRef;
    parentPageRef.parent = { parent: null };
    const optionsCollectionRef = {
      parent: parentVariantRef,
    };
    const optionDocRef = {
      parent: optionsCollectionRef,
    };

    const authorRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ uuid: 'auth-uuid' }),
      }),
    };

    const targetVariantDocs = [
      { data: () => ({ name: 'q', visibility: VISIBILITY_THRESHOLD }) },
      { data: () => ({ name: 'z', visibility: 0 }) },
    ];
    const targetVariantsQuery = {
      orderBy: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({ docs: targetVariantDocs }),
      })),
    };

    const targetPageRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ number: 7 }),
      }),
      collection: jest.fn(() => targetVariantsQuery),
    };

    const failingTargetPageRef = {
      get: jest.fn(() => Promise.reject(new Error('boom'))),
    };

    const db = {
      doc: jest.fn(path => {
        if (path === 'authors/author-123') {
          return authorRef;
        }
        if (path === 'options/parent') {
          return optionDocRef;
        }
        throw new Error(`Unexpected doc path: ${path}`);
      }),
    };

    optionsCollectionRef.parent = parentVariantRef;
    parentVariantRef.parent = { parent: parentPageRef };

    const variantsSnapForPersist = {
      docs: [{ data: () => ({ name: 'a', content: 'alpha', visibility: 1 }) }],
    };

    const pageSnap = {
      exists: true,
      data: () => ({ number: 5, incomingOption: 'options/parent' }),
      ref: null,
    };

    const rootVariantQuery = {
      limit: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({
          empty: false,
          docs: [{ data: () => ({ name: 'a' }) }],
        }),
      })),
    };

    const rootPageRef = {
      get: jest
        .fn()
        .mockResolvedValue({ exists: true, data: () => ({ number: 1 }) }),
      collection: jest.fn(() => ({ orderBy: jest.fn(() => rootVariantQuery) })),
    };

    const storyRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ title: 'Story Title', rootPage: rootPageRef }),
      }),
    };

    const pageRef = {
      parent: { parent: storyRef },
      get: jest.fn().mockResolvedValue(pageSnap),
      collection: jest.fn(name => {
        if (name === 'variants') {
          return {
            orderBy: jest.fn(() => ({
              limit: jest.fn(() => ({
                get: jest.fn().mockResolvedValue({
                  empty: false,
                  docs: [{ data: () => ({ name: 'a' }) }],
                }),
              })),
            })),
          };
        }
        throw new Error(`Unexpected collection ${name}`);
      }),
    };

    const optionsSnap = {
      docs: [
        {
          data: () => ({
            content: 'targeted option',
            position: 2,
            targetPage: targetPageRef,
          }),
        },
        {
          data: () => ({
            content: 'error option',
            position: 3,
            targetPage: failingTargetPageRef,
          }),
        },
        {
          data: () => ({ content: 'open option', position: 4 }),
        },
      ],
    };

    const variantSnap = {
      exists: true,
      data: () => ({
        name: 'a',
        content: 'Hello world',
        authorId: 'author-123',
        authorName: 'Author Name',
        incomingOption: 'options/parent',
      }),
      ref: {
        parent: {
          parent: pageRef,
          get: jest.fn().mockResolvedValue(variantsSnapForPersist),
        },
        collection: jest.fn(() => ({
          get: jest.fn().mockResolvedValue(optionsSnap),
        })),
      },
    };

    pageSnap.ref = pageRef;

    const renderVariant = createRenderVariant({
      db,
      storage,
      fetchFn,
      randomUUID,
      consoleError,
    });

    await renderVariant(variantSnap, { params: { variantId: 'variant-xyz' } });

    expect(storage.bucket).toHaveBeenCalledWith(DEFAULT_BUCKET_NAME);
    expect(bucketFile).toHaveBeenCalledWith('p/5a.html');
    expect(bucketFile).toHaveBeenCalledWith('p/5-alts.html');
    expect(bucketFile).toHaveBeenCalledWith('pending/variant-xyz.json');
    expect(authorFile.save).toHaveBeenCalled();
    expect(variantFile.save).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        contentType: 'text/html',
        metadata: { cacheControl: 'no-store' },
      })
    );
    expect(altsFile.save).toHaveBeenCalledWith(expect.any(String), {
      contentType: 'text/html',
    });
    expect(pendingFile.save).toHaveBeenCalledWith(
      JSON.stringify({ path: 'p/5a.html' }),
      expect.objectContaining({ metadata: { cacheControl: 'no-store' } })
    );
    expect(fetchFn).toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      'target page lookup failed',
      'boom'
    );
  });

  it('skips rendering when the page snapshot is missing', async () => {
    const storage = { bucket: jest.fn() };
    const renderVariant = createRenderVariant({
      db: { doc: jest.fn() },
      storage,
      fetchFn: jest.fn(),
      randomUUID: jest.fn(),
    });

    const snap = {
      exists: true,
      data: () => ({}),
      ref: {
        parent: {
          parent: { get: jest.fn().mockResolvedValue({ exists: false }) },
        },
      },
    };

    await expect(renderVariant(snap)).resolves.toBeNull();
    expect(storage.bucket).toHaveBeenCalled();
  });

  it('rejects when metadata token request fails', async () => {
    const bucket = {
      file: jest.fn(() => ({
        save: jest.fn().mockResolvedValue(undefined),
        exists: jest.fn().mockResolvedValue([true]),
      })),
    };
    const storage = { bucket: jest.fn(() => bucket) };
    const fetchFn = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    });
    const randomUUID = jest.fn(() => 'uuid');
    const db = { doc: jest.fn(() => ({ get: jest.fn() })) };

    const pageSnap = { exists: true, data: () => ({ number: 1 }), ref: null };
    const pageRef = {
      get: jest.fn().mockResolvedValue(pageSnap),
      parent: { parent: null },
    };
    pageSnap.ref = pageRef;

    const variantsCollectionRef = {
      parent: pageRef,
      get: jest.fn().mockResolvedValue({ docs: [] }),
    };
    const optionsCollection = {
      get: jest.fn().mockResolvedValue({ docs: [] }),
    };

    const snap = {
      exists: true,
      data: () => ({ name: 'a', content: 'Hello' }),
      ref: {
        parent: variantsCollectionRef,
        collection: jest.fn(() => optionsCollection),
      },
    };

    const renderVariant = createRenderVariant({
      db,
      storage,
      fetchFn,
      randomUUID,
    });

    await expect(
      renderVariant(snap, { params: { storyId: 'story-1' } })
    ).rejects.toThrow('metadata token: HTTP 500');

    expect(bucket.file).toHaveBeenCalledWith('p/1a.html');
  });

  it('logs invalidation failures and handles missing parent info', async () => {
    const consoleError = jest.fn();
    const variantFile = { save: jest.fn().mockResolvedValue(undefined) };
    const altsFile = { save: jest.fn().mockResolvedValue(undefined) };
    const pendingFile = { save: jest.fn().mockResolvedValue(undefined) };
    const bucket = {
      file: jest.fn(path => {
        if (path === 'p/1a.html') return variantFile;
        if (path === 'p/1-alts.html') return altsFile;
        if (path === 'pending/variant-xyz.json') return pendingFile;
        return {
          save: jest.fn().mockResolvedValue(undefined),
          exists: jest.fn().mockResolvedValue([true]),
        };
      }),
    };
    const storage = { bucket: jest.fn(() => bucket) };
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token' }),
      })
      .mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });
    const randomUUID = jest.fn(() => 'uuid');

    const authorRef = {
      get: jest.fn().mockResolvedValue({ exists: false }),
    };
    const db = {
      doc: jest.fn(path => {
        if (path === 'authors/missing') {
          return authorRef;
        }
        if (path === 'options/parentless') {
          return { parent: null };
        }
        throw new Error(`Unexpected doc path ${path}`);
      }),
    };

    const pageSnap = {
      exists: true,
      data: () => ({ number: 1, incomingOption: 'options/parentless' }),
      ref: null,
    };
    const pageRef = {
      get: jest.fn().mockResolvedValue(pageSnap),
      parent: { parent: null },
    };
    pageSnap.ref = pageRef;

    const variantsCollectionRef = {
      parent: pageRef,
      get: jest.fn().mockResolvedValue({
        docs: [
          { data: () => ({ name: 'a', content: 'alpha', visibility: 1 }) },
        ],
      }),
    };
    const optionsCollection = {
      get: jest.fn().mockResolvedValue({
        docs: [
          {
            data: () => ({
              content: 'choice',
              position: 0,
              targetPageNumber: 3,
            }),
          },
        ],
      }),
    };

    const snap = {
      exists: true,
      data: () => ({
        name: 'a',
        content: 'Hello',
        authorName: 'Author',
        authorId: 'missing',
        incomingOption: 'options/parentless',
      }),
      ref: {
        parent: variantsCollectionRef,
        collection: jest.fn(() => optionsCollection),
      },
    };

    const renderVariant = createRenderVariant({
      db,
      storage,
      fetchFn,
      randomUUID,
      consoleError,
    });

    await expect(
      renderVariant(snap, { params: { variantId: 'variant-xyz' } })
    ).resolves.toBeNull();

    expect(consoleError).toHaveBeenCalledWith(
      'invalidate /p/1-alts.html failed: 503'
    );
    expect(consoleError).toHaveBeenCalledWith(
      'invalidate /p/1a.html failed: 503'
    );
  });

  it('handles author lookups that reject and writes cached author pages', async () => {
    const consoleError = jest.fn();

    const authorFile = {
      exists: jest
        .fn()
        .mockResolvedValueOnce([false])
        .mockResolvedValue([true]),
      save: jest.fn().mockResolvedValue(undefined),
    };

    const bucket = {
      file: jest.fn(path => {
        if (path === 'a/author-uuid.html') {
          return authorFile;
        }

        return {
          save: jest.fn().mockResolvedValue(undefined),
          exists: jest.fn().mockResolvedValue([true]),
        };
      }),
    };

    const storage = { bucket: jest.fn(() => bucket) };

    const db = {
      doc: jest.fn(path => {
        if (path === 'authors/auth-1') {
          return {
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ uuid: 'author-uuid' }),
            }),
          };
        }

        throw new Error(`Unexpected doc path: ${path}`);
      }),
    };

    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token' }),
      })
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });

    const randomUUID = jest.fn(() => 'uuid');

    const pageSnap = {
      exists: true,
      data: () => ({ number: 12 }),
      ref: null,
    };
    const pageRef = {
      get: jest.fn().mockResolvedValue(pageSnap),
      parent: { parent: null },
    };
    pageSnap.ref = pageRef;

    const optionsCollection = {
      get: jest.fn().mockResolvedValue({ docs: [] }),
    };

    const variantSnap = {
      exists: true,
      data: () => ({
        name: 'b',
        content: 'sample',
        authorId: 'auth-1',
        authorName: 'Author',
      }),
      ref: {
        parent: {
          parent: pageRef,
          get: jest.fn().mockResolvedValue({ docs: [] }),
        },
        collection: jest.fn(() => optionsCollection),
      },
    };

    const renderVariant = createRenderVariant({
      db,
      storage,
      fetchFn,
      randomUUID,
      consoleError,
    });

    await renderVariant(variantSnap, { params: { storyId: 'story-7' } });

    expect(authorFile.save).toHaveBeenCalledWith(
      expect.stringContaining('<h1>Author</h1>'),
      { contentType: 'text/html' }
    );

    const errorDb = {
      doc: jest.fn(() => ({
        get: jest.fn(() => Promise.reject(new Error('fail'))),
      })),
    };

    const errorRender = createRenderVariant({
      db: errorDb,
      storage,
      fetchFn,
      randomUUID,
      consoleError,
    });

    await errorRender(variantSnap, { params: { storyId: 'story-7' } });
    expect(consoleError).toHaveBeenCalledWith('author lookup failed', 'fail');
  });
});

describe('getVisibleVariants', () => {
  it('filters variants below the visibility threshold', () => {
    const docs = [
      {
        data: () => ({
          visibility: VISIBILITY_THRESHOLD,
          name: 'a',
          content: 'A',
        }),
      },
      {
        data: () => ({ visibility: 0.25, name: 'b', content: 'B' }),
      },
      {
        data: () => ({ name: 'c', content: 'C' }),
      },
    ];

    const variants = getVisibleVariants(docs);
    expect(variants).toEqual([
      { name: 'a', content: 'A' },
      { name: 'c', content: 'C' },
    ]);
  });
});

describe('createHandleVariantWrite', () => {
  it('renders dirty variants and clears the flag', async () => {
    const renderVariant = jest.fn().mockResolvedValue(null);
    const getDeleteSentinel = jest.fn(() => 'sentinel');
    const handler = createHandleVariantWrite({
      renderVariant,
      getDeleteSentinel,
    });

    const change = {
      before: { exists: true, data: () => ({ visibility: 0 }) },
      after: {
        exists: true,
        data: () => ({ dirty: true, visibility: VISIBILITY_THRESHOLD }),
        ref: { update: jest.fn().mockResolvedValue(undefined) },
      },
    };

    await handler(change, { params: { storyId: 'story-1' } });

    expect(renderVariant).toHaveBeenCalledWith(change.after, {
      params: { storyId: 'story-1' },
    });
    expect(change.after.ref.update).toHaveBeenCalledWith({
      dirty: 'sentinel',
    });
  });

  it('renders newly visible variants and ignores unchanged ones', async () => {
    const renderVariant = jest.fn().mockResolvedValue(null);
    const handler = createHandleVariantWrite({
      renderVariant,
      getDeleteSentinel: () => null,
      visibilityThreshold: 2,
    });

    await handler(
      {
        before: { exists: false, data: () => ({}) },
        after: {
          exists: true,
          data: () => ({ visibility: 0 }),
          ref: { update: jest.fn() },
        },
      },
      {}
    );
    expect(renderVariant).toHaveBeenCalledTimes(1);

    renderVariant.mockClear();

    await handler(
      {
        before: { exists: true, data: () => ({ visibility: 1 }) },
        after: {
          exists: true,
          data: () => ({ visibility: 3 }),
          ref: { update: jest.fn() },
        },
      },
      {}
    );

    expect(renderVariant).toHaveBeenCalledTimes(1);

    renderVariant.mockClear();

    await handler(
      {
        before: { exists: true, data: () => ({ visibility: 3 }) },
        after: {
          exists: true,
          data: () => ({ visibility: 1 }),
          ref: { update: jest.fn() },
        },
      },
      {}
    );

    expect(renderVariant).not.toHaveBeenCalled();
  });
});
