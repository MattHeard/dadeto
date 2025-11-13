import { jest } from '@jest/globals';
import {
  createInvalidatePaths,
  buildOptionMetadata,
  resolveStoryMetadata,
  resolveAuthorMetadata,
  buildParentRoute,
  resolveParentUrl,
  createRenderVariant,
  createHandleVariantWrite,
  VISIBILITY_THRESHOLD,
  DEFAULT_BUCKET_NAME,
  getVisibleVariants,
  loadOptions,
  escapeHtml,
} from '../../../../src/core/cloud/render-variant/render-variant-core.js';

describe('createInvalidatePaths', () => {
  it('returns early when paths are not provided', async () => {
    const fetchFn = jest.fn();
    const randomUUID = jest.fn(() => 'uuid');
    const invalidatePaths = createInvalidatePaths({
      fetchFn,
      randomUUID,
    });

    await invalidatePaths(undefined);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('logs errors when the invalidation request rejects', async () => {
    const consoleError = jest.fn();
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token' }),
      })
      .mockRejectedValueOnce(new Error('boom'));

    const invalidatePaths = createInvalidatePaths({
      fetchFn,
      randomUUID: jest.fn(() => 'uuid'),
      consoleError,
      projectId: 'proj',
      urlMapName: 'map',
      cdnHost: 'cdn.example.com',
    });

    await invalidatePaths(['/p/1a.html']);

    expect(consoleError).toHaveBeenCalledWith(
      'invalidate /p/1a.html error',
      'boom'
    );
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('swallows invalidation errors when no logger is provided', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token' }),
      })
      .mockRejectedValueOnce(new Error('network'));

    const invalidatePaths = createInvalidatePaths({
      fetchFn,
      randomUUID: jest.fn(() => 'uuid'),
    });

    await expect(invalidatePaths(['/p/2a.html'])).resolves.toBeUndefined();
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});

describe('escapeHtml', () => {
  it('coerces falsy values to their string equivalents', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(0)).toBe('0');
    expect(escapeHtml(false)).toBe('false');
  });
});

describe('buildOptionMetadata', () => {
  it('derives target metadata when the target page exists', async () => {
    const variantDocs = {
      docs: [
        { data: () => ({ name: 'a', visibility: 0.8 }) },
        { data: () => ({ name: 'b', visibility: 0.6 }) },
      ],
    };

    const targetPage = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ number: 12 }),
      }),
      collection: jest.fn(() => ({
        orderBy: jest.fn(() => ({
          get: jest.fn().mockResolvedValue(variantDocs),
        })),
      })),
    };

    const result = await buildOptionMetadata({
      data: {
        content: 'Choice',
        position: 1,
        targetPage,
      },
      visibilityThreshold: 0.5,
      db: { doc: jest.fn() },
      consoleError: jest.fn(),
    });

    expect(targetPage.get).toHaveBeenCalled();
    expect(result).toEqual({
      content: 'Choice',
      position: 1,
      targetPageNumber: 12,
      targetVariantName: 'a',
      targetVariants: [
        { name: 'a', weight: 0.8 },
        { name: 'b', weight: 0.6 },
      ],
    });
  });

  it('logs when the target page lookup fails', async () => {
    const consoleError = jest.fn();
    const targetPage = {
      get: jest.fn().mockRejectedValue(new Error('missing')),
    };

    const result = await buildOptionMetadata({
      data: { content: 'Alt', position: 0, targetPage },
      visibilityThreshold: 0.5,
      db: { doc: jest.fn() },
      consoleError,
    });

    expect(consoleError).toHaveBeenCalledWith(
      'target page lookup failed',
      'missing'
    );
    expect(result).toEqual({ content: 'Alt', position: 0 });
  });

  it('logs the raw error when no message property exists', async () => {
    const consoleError = jest.fn();
    const errorObject = { foo: 'bar' };
    const targetPage = {
      get: jest.fn().mockRejectedValue(errorObject),
    };

    await buildOptionMetadata({
      data: { content: 'Alt', position: 0, targetPage },
      visibilityThreshold: 0.5,
      db: { doc: jest.fn() },
      consoleError,
    });

    expect(consoleError).toHaveBeenCalledWith(
      'target page lookup failed',
      errorObject
    );
  });

  it('quietly ignores failures when no logger is supplied', async () => {
    const targetPage = {
      get: jest.fn().mockRejectedValue(new Error('boom')),
    };

    const result = await buildOptionMetadata({
      data: { content: 'Silent', position: 9, targetPage },
      visibilityThreshold: 0.5,
      db: { doc: jest.fn() },
    });

    expect(result).toEqual({ content: 'Silent', position: 9 });
  });

  it('returns bare metadata when the target page snapshot is missing', async () => {
    const targetPage = {
      get: jest.fn().mockResolvedValue({ exists: false }),
    };

    const result = await buildOptionMetadata({
      data: { content: 'Unknown', position: 5, targetPage },
      visibilityThreshold: 0.5,
      db: { doc: jest.fn() },
      consoleError: jest.fn(),
    });

    expect(result).toEqual({ content: 'Unknown', position: 5 });
    expect(targetPage.get).toHaveBeenCalled();
  });

  it('skips variant metadata when no visible variants are found', async () => {
    const variantDocs = { docs: [] };
    const targetPage = {
      get: jest
        .fn()
        .mockResolvedValue({ exists: true, data: () => ({ number: 42 }) }),
      collection: jest.fn(() => ({
        orderBy: jest.fn(() => ({
          get: jest.fn().mockResolvedValue(variantDocs),
        })),
      })),
    };

    const result = await buildOptionMetadata({
      data: { content: 'No variants', position: 3, targetPage },
      visibilityThreshold: 0.5,
      db: { doc: jest.fn() },
      consoleError: jest.fn(),
    });

    expect(result).toEqual({
      content: 'No variants',
      position: 3,
      targetPageNumber: 42,
    });
  });

  it('falls back to a provided target page number', async () => {
    const result = await buildOptionMetadata({
      data: { content: 'Direct', position: 2, targetPageNumber: 7 },
      visibilityThreshold: 0.5,
      db: { doc: jest.fn() },
      consoleError: jest.fn(),
    });

    expect(result).toEqual({
      content: 'Direct',
      position: 2,
      targetPageNumber: 7,
    });
  });
});

describe('loadOptions', () => {
  it('defaults missing variant visibility to 1 when building targets', async () => {
    const optionDocs = [
      {
        data: () => ({
          content: 'Explore',
          position: 0,
          targetPage: {
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ number: 9 }),
            }),
            collection: jest.fn(() => ({
              orderBy: jest.fn(() => ({
                get: jest.fn().mockResolvedValue({
                  docs: [
                    { data: () => ({ name: 'a', visibility: 0.6 }) },
                    { data: () => ({ name: 'b' }) },
                  ],
                }),
              })),
            })),
          },
        }),
      },
    ];

    const snap = {
      ref: {
        collection: () => ({
          get: jest.fn().mockResolvedValue({ docs: optionDocs }),
        }),
      },
    };

    const result = await loadOptions({
      snap,
      visibilityThreshold: 0.5,
      db: { doc: jest.fn() },
      consoleError: jest.fn(),
    });

    expect(result).toEqual([
      {
        content: 'Explore',
        position: 0,
        targetPageNumber: 9,
        targetVariantName: 'a',
        targetVariants: [
          { name: 'a', weight: 0.6 },
          { name: 'b', weight: 1 },
        ],
      },
    ]);
  });
});

describe('resolveStoryMetadata', () => {
  it('builds the parent URL when the story exposes a root page', async () => {
    const rootVariantSnap = {
      empty: false,
      docs: [{ data: () => ({ name: 'a' }) }],
    };

    const rootPageRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ number: 7 }),
      }),
      collection: jest.fn(() => ({
        orderBy: jest.fn(() => ({
          limit: jest.fn(() => ({
            get: jest.fn().mockResolvedValue(rootVariantSnap),
          })),
        })),
      })),
    };

    const storySnap = {
      exists: true,
      data: () => ({ title: 'Story', rootPage: rootPageRef }),
    };

    const pageSnap = {
      ref: {
        parent: { parent: { get: jest.fn().mockResolvedValue(storySnap) } },
      },
    };

    const result = await resolveStoryMetadata({
      pageSnap,
      page: { incomingOption: true },
      consoleError: jest.fn(),
    });

    expect(result).toEqual({
      storyTitle: 'Story',
      firstPageUrl: '/p/7a.html',
    });
  });

  it('logs when the root page lookup rejects', async () => {
    const consoleError = jest.fn();
    const rootPageRef = {
      get: jest.fn().mockRejectedValue(new Error('offline')),
      collection: jest.fn(),
    };
    const storySnap = {
      exists: true,
      data: () => ({ title: 'Story', rootPage: rootPageRef }),
    };
    const pageSnap = {
      ref: {
        parent: { parent: { get: jest.fn().mockResolvedValue(storySnap) } },
      },
    };

    const result = await resolveStoryMetadata({
      pageSnap,
      page: { incomingOption: true },
      consoleError,
    });

    expect(consoleError).toHaveBeenCalledWith(
      'root page lookup failed',
      'offline'
    );
    expect(result.firstPageUrl).toBeUndefined();
  });

  it('logs raw error when rejection message is falsy', async () => {
    const consoleError = jest.fn();
    const rejectionError = { message: undefined };
    const rootPageRef = {
      get: jest.fn().mockRejectedValue(rejectionError),
      collection: jest.fn(),
    };
    const storySnap = {
      exists: true,
      data: () => ({ title: 'Story', rootPage: rootPageRef }),
    };
    const pageSnap = {
      ref: {
        parent: { parent: { get: jest.fn().mockResolvedValue(storySnap) } },
      },
    };

    const result = await resolveStoryMetadata({
      pageSnap,
      page: { incomingOption: true },
      consoleError,
    });

    expect(consoleError).toHaveBeenCalledWith(
      'root page lookup failed',
      rejectionError
    );
    expect(result.firstPageUrl).toBeUndefined();
  });
});

describe('resolveAuthorMetadata', () => {
  it('creates a landing page when the author uuid is missing from storage', async () => {
    const authorFile = {
      exists: jest.fn().mockResolvedValue([false]),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const bucket = {
      file: jest.fn(() => authorFile),
    };

    const authorSnap = {
      exists: true,
      data: () => ({ uuid: 'writer-1' }),
    };

    const db = {
      doc: jest.fn(() => ({ get: jest.fn().mockResolvedValue(authorSnap) })),
    };

    const result = await resolveAuthorMetadata({
      variant: { authorId: 'author-1', authorName: 'Writer' },
      db,
      bucket,
      consoleError: jest.fn(),
    });

    expect(bucket.file).toHaveBeenCalledWith('a/writer-1.html');
    expect(authorFile.save).toHaveBeenCalled();
    expect(result).toEqual({
      authorName: 'Writer',
      authorUrl: '/a/writer-1.html',
    });
  });

  it('reuses the existing author file when present', async () => {
    const authorFile = {
      exists: jest.fn().mockResolvedValue([true]),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const bucket = {
      file: jest.fn(() => authorFile),
    };

    const authorSnap = {
      exists: true,
      data: () => ({ uuid: 'writer-2' }),
    };

    const db = {
      doc: jest.fn(() => ({ get: jest.fn().mockResolvedValue(authorSnap) })),
    };

    const result = await resolveAuthorMetadata({
      variant: { authorId: 'author-2', authorName: 'Second' },
      db,
      bucket,
      consoleError: jest.fn(),
    });

    expect(authorFile.save).not.toHaveBeenCalled();
    expect(result).toEqual({
      authorName: 'Second',
      authorUrl: '/a/writer-2.html',
    });
  });

  it('logs and recovers when author lookups fail', async () => {
    const consoleError = jest.fn();
    const db = {
      doc: jest.fn(() => ({
        get: jest.fn(() => Promise.reject(new Error('offline'))),
      })),
    };

    const result = await resolveAuthorMetadata({
      variant: { authorId: 'author-1', authorName: 'Writer' },
      db,
      bucket: { file: jest.fn() },
      consoleError,
    });

    expect(consoleError).toHaveBeenCalledWith(
      'author lookup failed',
      'offline'
    );
    expect(result.authorUrl).toBeUndefined();
  });

  it('logs raw errors when lookup rejects without a message', async () => {
    const consoleError = jest.fn();
    const rawError = { code: 500 };
    const db = {
      doc: jest.fn(() => ({
        get: jest.fn(() => Promise.reject(rawError)),
      })),
    };

    const result = await resolveAuthorMetadata({
      variant: { authorId: 'author-1', authorName: 'Writer' },
      db,
      bucket: { file: jest.fn() },
      consoleError,
    });

    expect(consoleError).toHaveBeenCalledWith('author lookup failed', rawError);
    expect(result.authorUrl).toBeUndefined();
  });
});

describe('buildParentRoute', () => {
  it('returns null when parent identifiers are missing', () => {
    const parentVariantSnap = { data: () => ({}) };
    const parentPageSnap = { data: () => ({ number: undefined }) };

    expect(buildParentRoute(parentVariantSnap, parentPageSnap)).toBeNull();
  });

  it('returns a formatted parent path when identifiers exist', () => {
    const parentVariantSnap = { data: () => ({ name: 'b' }) };
    const parentPageSnap = { data: () => ({ number: 14 }) };

    expect(buildParentRoute(parentVariantSnap, parentPageSnap)).toBe(
      '/p/14b.html'
    );
  });
});

describe('resolveParentUrl', () => {
  it('returns undefined when the incoming option is not provided', async () => {
    await expect(
      resolveParentUrl({ variant: {}, db: { doc: jest.fn() } })
    ).resolves.toBeUndefined();
  });

  it('logs lookup failures when parent resolution throws', async () => {
    const consoleError = jest.fn();
    const db = {
      doc: jest.fn(() => {
        throw new Error('boom');
      }),
    };

    await expect(
      resolveParentUrl({
        variant: { incomingOption: 'options/1' },
        db,
        consoleError,
      })
    ).resolves.toBeUndefined();

    expect(consoleError).toHaveBeenCalledWith('parent lookup failed', 'boom');
  });

  it('logs raw errors when lookup rejects without a message', async () => {
    const consoleError = jest.fn();
    const rawError = { code: 500 };
    const db = {
      doc: jest.fn(() => {
        throw rawError;
      }),
    };

    await expect(
      resolveParentUrl({
        variant: { incomingOption: 'options/1' },
        db,
        consoleError,
      })
    ).resolves.toBeUndefined();

    expect(consoleError).toHaveBeenCalledWith('parent lookup failed', rawError);
  });
});

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

  it('logs when the root page lookup fails', async () => {
    const consoleError = jest.fn();

    const variantFile = { save: jest.fn().mockResolvedValue(undefined) };
    const altsFile = { save: jest.fn().mockResolvedValue(undefined) };
    const pendingFile = { save: jest.fn().mockResolvedValue(undefined) };

    const bucket = {
      file: jest.fn(path => {
        if (path === 'p/9a.html') {
          return variantFile;
        }
        if (path === 'p/9-alts.html') {
          return altsFile;
        }
        if (path === 'pending/variant-1.json') {
          return pendingFile;
        }

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
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });

    const randomUUID = jest.fn(() => 'uuid');

    const rootPageRef = {
      get: jest.fn(() => Promise.reject(new Error('boom'))),
    };

    const storyRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ title: 'Story', rootPage: rootPageRef }),
      }),
    };

    const pageSnap = {
      exists: true,
      data: () => ({ number: 9, incomingOption: 'incoming/options/opt' }),
      ref: { parent: { parent: storyRef } },
    };

    const pageRef = {
      get: jest.fn().mockResolvedValue(pageSnap),
      parent: { parent: storyRef },
    };

    const variantsCollection = {
      parent: pageRef,
      get: jest.fn().mockResolvedValue({ docs: [] }),
    };

    const optionsCollection = {
      get: jest.fn().mockResolvedValue({ docs: [] }),
    };

    const renderVariant = createRenderVariant({
      db: { doc: jest.fn() },
      storage,
      fetchFn,
      randomUUID,
      consoleError,
    });

    const snap = {
      exists: true,
      data: () => ({
        name: 'a',
        content: 'Body',
        incomingOption: null,
      }),
      ref: {
        parent: variantsCollection,
        collection: jest.fn(() => optionsCollection),
      },
    };

    await renderVariant(snap, { params: { variantId: 'variant-1' } });

    expect(consoleError).toHaveBeenCalledWith(
      'root page lookup failed',
      'boom'
    );
  });

  it('does not fetch root variants when the submission is direct', async () => {
    const variantFile = { save: jest.fn().mockResolvedValue(undefined) };
    const altsFile = { save: jest.fn().mockResolvedValue(undefined) };
    const pendingFile = { save: jest.fn().mockResolvedValue(undefined) };

    const bucket = {
      file: jest.fn(() => ({
        save: jest.fn().mockResolvedValue(undefined),
        exists: jest.fn().mockResolvedValue([true]),
      })),
    };

    const storage = { bucket: jest.fn(() => bucket) };
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token' }),
      })
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    const randomUUID = jest.fn(() => 'uuid');

    const rootPageRef = {
      get: jest
        .fn()
        .mockResolvedValue({ exists: true, data: () => ({ number: 30 }) }),
      collection: jest.fn(),
    };

    const storyRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ title: 'Story Title', rootPage: rootPageRef }),
      }),
    };

    const pageSnap = {
      exists: true,
      data: () => ({ number: 14 }),
      ref: null,
    };
    const pageRef = {
      get: jest.fn().mockResolvedValue(pageSnap),
      parent: { parent: storyRef },
    };
    pageSnap.ref = pageRef;

    const variantsSnap = {
      docs: [{ data: () => ({ name: 'a', content: 'Body', visibility: 1 }) }],
    };
    const variantsCollection = {
      parent: pageRef,
      get: jest.fn().mockResolvedValue(variantsSnap),
    };
    const optionsCollection = {
      get: jest.fn().mockResolvedValue({ docs: [] }),
    };

    const renderVariant = createRenderVariant({
      db: { doc: jest.fn() },
      storage,
      fetchFn,
      randomUUID,
    });

    const snap = {
      exists: true,
      data: () => ({ name: 'a', content: 'Body' }),
      ref: {
        parent: variantsCollection,
        collection: jest.fn(() => optionsCollection),
      },
    };

    await renderVariant(snap, { params: { storyId: 'story-14' } });

    expect(rootPageRef.collection).not.toHaveBeenCalled();
  });

  it('handles missing root page snapshots without logging', async () => {
    const consoleError = jest.fn();

    const bucket = {
      file: jest.fn(() => ({
        save: jest.fn().mockResolvedValue(undefined),
        exists: jest.fn().mockResolvedValue([true]),
      })),
    };
    const storage = { bucket: jest.fn(() => bucket) };
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token' }),
      })
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    const randomUUID = jest.fn(() => 'uuid');

    const rootPageRef = {
      get: jest.fn().mockResolvedValue({ exists: false }),
    };

    const storyRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ title: 'Story', rootPage: rootPageRef }),
      }),
    };

    const pageSnap = {
      exists: true,
      data: () => ({
        number: 15,
        incomingOption: 'incoming/options/opt',
        incomingOptionFullName: 'incoming/options/opt',
      }),
      ref: null,
    };
    const pageRef = {
      get: jest.fn().mockResolvedValue(pageSnap),
      parent: { parent: storyRef },
    };
    pageSnap.ref = pageRef;

    const variantsCollection = {
      parent: pageRef,
      get: jest.fn().mockResolvedValue({ docs: [] }),
    };
    const optionsCollection = {
      get: jest.fn().mockResolvedValue({ docs: [] }),
    };

    const renderVariant = createRenderVariant({
      db: {
        doc: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({ exists: false }),
        })),
      },
      storage,
      fetchFn,
      randomUUID,
      consoleError,
    });

    const snap = {
      exists: true,
      data: () => ({
        name: 'a',
        content: 'Body',
        incomingOption: 'options/opt',
        incomingOptionFullName: 'incoming/options/opt',
      }),
      ref: {
        parent: variantsCollection,
        collection: jest.fn(() => optionsCollection),
      },
    };

    await renderVariant(snap, { params: { storyId: 'story-15' } });

    expect(consoleError).not.toHaveBeenCalled();
  });

  it('constructs story metadata and parent route for closed variants', async () => {
    const consoleError = jest.fn();

    const variantFile = { save: jest.fn().mockResolvedValue(undefined) };
    const altsFile = { save: jest.fn().mockResolvedValue(undefined) };
    const pendingFile = { save: jest.fn().mockResolvedValue(undefined) };

    const bucket = {
      file: jest.fn(path => {
        if (path === 'p/12a.html') {
          return variantFile;
        }
        if (path === 'p/12-alts.html') {
          return altsFile;
        }
        if (path === 'pending/story-12.json') {
          return pendingFile;
        }

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
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });

    const randomUUID = jest.fn(() => 'uuid');

    const parentVariantSnap = {
      exists: true,
      data: () => ({ name: 'b' }),
    };
    const parentPageSnap = { exists: true, data: () => ({ number: 99 }) };
    const parentPageRef = { get: jest.fn().mockResolvedValue(parentPageSnap) };
    const parentVariantRef = {
      get: jest.fn().mockResolvedValue(parentVariantSnap),
      parent: { parent: parentPageRef },
    };
    const optionCollection = { parent: parentVariantRef };
    const optionRef = { parent: optionCollection };

    const rootVariantQuery = {
      limit: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({
          empty: false,
          docs: [{ data: () => ({ name: 'z' }) }],
        }),
      })),
    };

    const rootPageRef = {
      get: jest
        .fn()
        .mockResolvedValue({ exists: true, data: () => ({ number: 30 }) }),
      collection: jest.fn(() => ({ orderBy: jest.fn(() => rootVariantQuery) })),
    };

    const storyRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ title: 'Story Title', rootPage: rootPageRef }),
      }),
    };

    const pageSnap = {
      exists: true,
      data: () => ({
        number: 12,
        incomingOption: 'incoming/options/opt',
        incomingOptionFullName: 'incoming/options/opt',
      }),
      ref: null,
    };

    const pageRef = {
      get: jest.fn().mockResolvedValue(pageSnap),
      parent: { parent: storyRef },
    };
    pageSnap.ref = pageRef;

    const variantsSnapForPersist = {
      docs: [{ data: () => ({ name: 'a', content: 'Body', visibility: 1 }) }],
    };

    const variantsCollection = {
      parent: pageRef,
      get: jest.fn().mockResolvedValue(variantsSnapForPersist),
    };

    const optionsSnap = {
      docs: [
        {
          data: () => ({
            content: 'Go to page 20',
            position: 1,
            targetPageNumber: 20,
          }),
        },
      ],
    };

    const optionsCollection = {
      get: jest.fn().mockResolvedValue(optionsSnap),
    };

    const db = {
      doc: jest.fn(path => {
        if (path === 'options/opt') {
          return optionRef;
        }
        if (path.startsWith('authors/')) {
          return {
            get: jest.fn().mockResolvedValue({ exists: false }),
          };
        }
        return { get: jest.fn() };
      }),
    };

    const renderVariant = createRenderVariant({
      db,
      storage,
      fetchFn,
      randomUUID,
      consoleError,
    });

    const snap = {
      exists: true,
      data: () => ({
        name: 'a',
        content: 'Body',
        incomingOption: 'options/opt',
        incomingOptionFullName: 'incoming/options/opt',
        authorId: 'auth-1',
        authorName: 'Author',
      }),
      ref: {
        parent: variantsCollection,
        collection: jest.fn(() => optionsCollection),
      },
    };

    await renderVariant(snap, { params: { storyId: 'story-12' } });

    expect(variantFile.save.mock.calls[0][1]).toEqual({
      contentType: 'text/html',
    });
    const html = variantFile.save.mock.calls[0][0];
    expect(html).toContain('/p/30z.html');
    expect(html).toContain('Story Title');

    const computeCalls = fetchFn.mock.calls.filter(([url]) =>
      url.startsWith('https://compute.googleapis.com')
    );
    expect(computeCalls).toHaveLength(3);
    expect(JSON.parse(computeCalls[2][1].body).path).toBe('/p/99b.html');
  });

  it('skips author landing page creation when uuid is missing', async () => {
    const variantFile = { save: jest.fn().mockResolvedValue(undefined) };
    const altsFile = { save: jest.fn().mockResolvedValue(undefined) };
    const pendingFile = { save: jest.fn().mockResolvedValue(undefined) };

    const bucket = {
      file: jest.fn(path => {
        if (path === 'p/2a.html') {
          return variantFile;
        }
        if (path === 'p/2-alts.html') {
          return altsFile;
        }
        if (path === 'pending/variant-2.json') {
          return pendingFile;
        }

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
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });

    const randomUUID = jest.fn(() => 'uuid');

    const storyRef = {
      get: jest.fn().mockResolvedValue({ exists: true, data: () => ({}) }),
    };

    const pageSnap = {
      exists: true,
      data: () => ({ number: 2 }),
      ref: null,
    };
    const pageRef = {
      get: jest.fn().mockResolvedValue(pageSnap),
      parent: { parent: storyRef },
    };
    pageSnap.ref = pageRef;

    const variantsSnap = {
      docs: [{ data: () => ({ name: 'a', content: 'Body', visibility: 1 }) }],
    };

    const variantsCollection = {
      parent: pageRef,
      get: jest.fn().mockResolvedValue(variantsSnap),
    };

    const optionsCollection = {
      get: jest.fn().mockResolvedValue({ docs: [] }),
    };

    const db = {
      doc: jest.fn(path => {
        if (path === 'authors/auth-uuid') {
          return {
            get: jest
              .fn()
              .mockResolvedValue({ exists: true, data: () => ({}) }),
          };
        }
        return { get: jest.fn() };
      }),
    };

    const renderVariant = createRenderVariant({
      db,
      storage,
      fetchFn,
      randomUUID,
    });

    const snap = {
      exists: true,
      data: () => ({
        name: 'a',
        content: 'Body',
        authorId: 'auth-uuid',
        authorName: 'Author Missing UUID',
      }),
      ref: {
        parent: variantsCollection,
        collection: jest.fn(() => optionsCollection),
      },
    };

    await renderVariant(snap, { params: { storyId: 'story-2' } });

    expect(bucket.file).not.toHaveBeenCalledWith('a/author-uuid.html');
  });

  it('returns empty story metadata when the story document is missing', async () => {
    const consoleError = jest.fn();

    const variantFile = { save: jest.fn().mockResolvedValue(undefined) };
    const altsFile = { save: jest.fn().mockResolvedValue(undefined) };
    const pendingFile = { save: jest.fn().mockResolvedValue(undefined) };

    const bucket = {
      file: jest.fn(path => {
        if (path === 'p/3a.html') {
          return variantFile;
        }
        if (path === 'p/3-alts.html') {
          return altsFile;
        }
        if (path === 'pending/story-3.json') {
          return pendingFile;
        }

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
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });

    const randomUUID = jest.fn(() => 'uuid');

    const storyRef = {
      get: jest.fn().mockResolvedValue({ exists: false }),
    };

    const pageSnap = {
      exists: true,
      data: () => ({ number: 3 }),
      ref: null,
    };
    const pageRef = {
      get: jest.fn().mockResolvedValue(pageSnap),
      parent: { parent: storyRef },
    };
    pageSnap.ref = pageRef;

    const variantsSnap = {
      docs: [{ data: () => ({ name: 'a', content: 'Body', visibility: 1 }) }],
    };

    const variantsCollection = {
      parent: pageRef,
      get: jest.fn().mockResolvedValue(variantsSnap),
    };

    const optionsCollection = {
      get: jest.fn().mockResolvedValue({ docs: [] }),
    };

    const renderVariant = createRenderVariant({
      db: { doc: jest.fn() },
      storage,
      fetchFn,
      randomUUID,
      consoleError,
    });

    const snap = {
      exists: true,
      data: () => ({ name: 'a', content: 'Body' }),
      ref: {
        parent: variantsCollection,
        collection: jest.fn(() => optionsCollection),
      },
    };

    await renderVariant(snap, { params: { storyId: 'story-3' } });

    const html = variantFile.save.mock.calls[0][0];
    expect(html).not.toContain('Story Title');
    expect(html).not.toContain('/p/30z.html');
  });

  it('returns null when the variant snapshot no longer exists', async () => {
    const storage = { bucket: jest.fn() };
    const renderVariant = createRenderVariant({
      db: { doc: jest.fn() },
      storage,
      fetchFn: jest.fn(),
      randomUUID: jest.fn(),
    });

    await expect(
      renderVariant({ exists: false, ref: {} }, { params: {} })
    ).resolves.toBeNull();
    expect(storage.bucket).toHaveBeenCalledTimes(1);
  });

  it('skips parent url when parent route cannot be constructed', async () => {
    const bucket = {
      file: jest.fn(path => ({
        save: jest.fn().mockResolvedValue(undefined),
        exists: jest.fn().mockResolvedValue([true]),
      })),
    };
    const storage = { bucket: jest.fn(() => bucket) };
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token' }),
      })
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });

    const randomUUID = jest.fn(() => 'uuid');

    const parentVariantRef = {
      get: jest.fn().mockResolvedValue({ exists: true, data: () => ({}) }),
      parent: {
        parent: {
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({ number: undefined }),
          }),
        },
      },
    };

    const optionRef = { parent: { parent: parentVariantRef } };

    const storyRef = {
      get: jest.fn().mockResolvedValue({ exists: true, data: () => ({}) }),
    };

    const pageSnap = {
      exists: true,
      data: () => ({
        number: 10,
        incomingOption: 'incoming/options/opt',
        incomingOptionFullName: 'incoming/options/opt',
      }),
      ref: null,
    };
    const pageRef = {
      get: jest.fn().mockResolvedValue(pageSnap),
      parent: { parent: storyRef },
    };
    pageSnap.ref = pageRef;

    const variantsCollection = {
      parent: pageRef,
      get: jest.fn().mockResolvedValue({ docs: [] }),
    };
    const optionsCollection = {
      get: jest.fn().mockResolvedValue({ docs: [] }),
    };

    const db = {
      doc: jest.fn(path => {
        if (path === 'options/malformed-parent') {
          return optionRef;
        }
        return { get: jest.fn() };
      }),
    };

    const renderVariant = createRenderVariant({
      db,
      storage,
      fetchFn,
      randomUUID,
    });

    const snap = {
      exists: true,
      data: () => ({
        name: 'a',
        content: 'Body',
        incomingOption: 'options/malformed-parent',
        incomingOptionFullName: 'incoming/options/opt',
      }),
      ref: {
        parent: variantsCollection,
        collection: jest.fn(() => optionsCollection),
      },
    };

    await renderVariant(snap, { params: { storyId: 'story-10' } });

    const computeCalls = fetchFn.mock.calls.filter(([url]) =>
      url.startsWith('https://compute.googleapis.com')
    );
    expect(computeCalls).toHaveLength(2);
  });

  it('logs and skips parent url when lookup fails', async () => {
    const consoleError = jest.fn();

    const variantFile = { save: jest.fn().mockResolvedValue(undefined) };
    const altsFile = { save: jest.fn().mockResolvedValue(undefined) };
    const pendingFile = { save: jest.fn().mockResolvedValue(undefined) };

    const bucket = {
      file: jest.fn(path => {
        if (path === 'p/6a.html') {
          return variantFile;
        }
        if (path === 'p/6-alts.html') {
          return altsFile;
        }
        if (path === 'pending/story-6.json') {
          return pendingFile;
        }

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
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });

    const randomUUID = jest.fn(() => 'uuid');

    const optionError = new Error('missing parent');
    const db = {
      doc: jest.fn(path => {
        if (path === 'options/throw') {
          throw optionError;
        }

        return { get: jest.fn() };
      }),
    };

    const storyRef = {
      get: jest.fn().mockResolvedValue({ exists: true, data: () => ({}) }),
    };

    const pageSnap = {
      exists: true,
      data: () => ({ number: 6 }),
      ref: { parent: { parent: storyRef } },
    };

    const pageRef = {
      get: jest.fn().mockResolvedValue(pageSnap),
      parent: { parent: storyRef },
    };

    const variantsCollection = {
      parent: pageRef,
      get: jest.fn().mockResolvedValue({ docs: [] }),
    };

    const optionsCollection = {
      get: jest.fn().mockResolvedValue({ docs: [] }),
    };

    const renderVariant = createRenderVariant({
      db,
      storage,
      fetchFn,
      randomUUID,
      consoleError,
    });

    const snap = {
      exists: true,
      data: () => ({
        name: 'a',
        content: 'Body',
        incomingOption: 'options/throw',
      }),
      ref: {
        parent: variantsCollection,
        collection: jest.fn(() => optionsCollection),
      },
    };

    await renderVariant(snap, { params: { storyId: 'story-6' } });

    expect(consoleError).toHaveBeenCalledWith(
      'parent lookup failed',
      'missing parent'
    );
  });

  it('omits parent invalidation when parent snapshots are missing', async () => {
    const variantFile = { save: jest.fn().mockResolvedValue(undefined) };
    const altsFile = { save: jest.fn().mockResolvedValue(undefined) };
    const pendingFile = { save: jest.fn().mockResolvedValue(undefined) };

    const bucket = {
      file: jest.fn(path => {
        if (path === 'p/8a.html') {
          return variantFile;
        }
        if (path === 'p/8-alts.html') {
          return altsFile;
        }
        if (path === 'pending/story-8.json') {
          return pendingFile;
        }

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
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });

    const randomUUID = jest.fn(() => 'uuid');

    const parentVariantRef = {
      get: jest.fn().mockResolvedValue({ exists: false }),
      parent: {
        parent: {
          get: jest
            .fn()
            .mockResolvedValue({ exists: true, data: () => ({ number: 77 }) }),
        },
      },
    };
    const optionCollection = { parent: parentVariantRef };
    const optionRef = { parent: optionCollection };

    const storyRef = {
      get: jest.fn().mockResolvedValue({ exists: true, data: () => ({}) }),
    };

    const pageSnap = {
      exists: true,
      data: () => ({
        number: 8,
        incomingOption: 'incoming/options/opt',
        incomingOptionFullName: 'incoming/options/opt',
      }),
      ref: null,
    };
    const pageRef = {
      get: jest.fn().mockResolvedValue(pageSnap),
      parent: { parent: storyRef },
    };
    pageSnap.ref = pageRef;

    const variantsSnap = {
      docs: [{ data: () => ({ name: 'a', content: 'Body', visibility: 1 }) }],
    };
    const variantsCollection = {
      parent: pageRef,
      get: jest.fn().mockResolvedValue(variantsSnap),
    };

    const optionsCollection = {
      get: jest.fn().mockResolvedValue({ docs: [] }),
    };

    const db = {
      doc: jest.fn(path => {
        if (path === 'options/missing-parent') {
          return optionRef;
        }
        return { get: jest.fn() };
      }),
    };

    const renderVariant = createRenderVariant({
      db,
      storage,
      fetchFn,
      randomUUID,
    });

    const snap = {
      exists: true,
      data: () => ({
        name: 'a',
        content: 'Body',
        incomingOption: 'options/missing-parent',
        incomingOptionFullName: 'incoming/options/opt',
      }),
      ref: {
        parent: variantsCollection,
        collection: jest.fn(() => optionsCollection),
      },
    };

    await renderVariant(snap, { params: { storyId: 'story-8' } });

    const computeCalls = fetchFn.mock.calls.filter(([url]) =>
      url.startsWith('https://compute.googleapis.com')
    );
    expect(computeCalls).toHaveLength(2);
  });

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

  it('treats missing fields as defaults', () => {
    const docs = [
      { data: () => ({}) },
      { data: () => ({ visibility: 1, name: 'ok', content: 'Text' }) },
    ];

    expect(getVisibleVariants(docs)).toEqual([
      { name: '', content: '' },
      { name: 'ok', content: 'Text' },
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

  it('returns early when the variant snapshot is deleted', async () => {
    const renderVariant = jest.fn();
    const handler = createHandleVariantWrite({
      renderVariant,
      getDeleteSentinel: () => null,
    });

    await expect(
      handler({ before: { exists: true }, after: { exists: false } }, {})
    ).resolves.toBeNull();
    expect(renderVariant).not.toHaveBeenCalled();
  });
});
