import { jest } from '@jest/globals';

import {
  createCorsOptions,
  createGetModerationVariantResponder,
  createHandleCorsOrigin,
  getAllowedOrigins,
  isAllowedOrigin,
  productionOrigins,
} from '../../../../src/core/cloud/get-moderation-variant/get-moderation-variant-core.js';

describe('getAllowedOrigins', () => {
  it('returns production origins in prod', () => {
    expect(getAllowedOrigins({ DENDRITE_ENVIRONMENT: 'prod' })).toEqual(productionOrigins);
  });

  it('returns playwright origin when targeting playwright environments', () => {
    expect(
      getAllowedOrigins({
        DENDRITE_ENVIRONMENT: 't-1234',
        PLAYWRIGHT_ORIGIN: 'https://playwright.example',
      }),
    ).toEqual(['https://playwright.example']);
  });

  it('falls back to production origins without playwright origin override', () => {
    expect(getAllowedOrigins({ DENDRITE_ENVIRONMENT: 't-e2e' })).toEqual([]);
    expect(getAllowedOrigins({ DENDRITE_ENVIRONMENT: 'staging' })).toEqual(productionOrigins);
    expect(getAllowedOrigins(undefined)).toEqual(productionOrigins);
  });
});

describe('createHandleCorsOrigin', () => {
  it('approves origins that pass the predicate', () => {
    const handler = createHandleCorsOrigin((origin, origins) => origin === origins[0], [
      'https://allowed.example',
    ]);

    handler('https://allowed.example', (error, allow) => {
      expect(error).toBeNull();
      expect(allow).toBe(true);
    });
  });

  it('rejects origins that fail the predicate', () => {
    const handler = createHandleCorsOrigin(() => false, productionOrigins);

    handler('https://blocked.example', error => {
      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toBe('CORS');
    });
  });
});

describe('createCorsOptions', () => {
  it('creates a GET-only cors configuration', () => {
    const origin = jest.fn();
    expect(createCorsOptions(origin)).toEqual({ origin, methods: ['GET'] });
  });
});

describe('createGetModerationVariantResponder', () => {
  const token = 'encoded-token';

  function createRequestWithGet(header) {
    return {
      get(name) {
        if (name === 'Authorization' || name === 'authorization') {
          return header;
        }
        return undefined;
      },
    };
  }

  function createRequestWithHeaders(headers) {
    return { headers };
  }

  function createDb(returnedSnap) {
    return {
      collection(name) {
        expect(name).toBe('moderators');
        return {
          doc(id) {
            expect(id).toBe('moderator-uid');
            return {
              async get() {
                return returnedSnap;
              },
            };
          },
        };
      },
    };
  }

  it('requires a Firestore-like dependency', () => {
    expect(() =>
      createGetModerationVariantResponder({
        db: null,
        auth: { verifyIdToken: jest.fn() },
      }),
    ).toThrow(new TypeError('db must provide a collection method'));
  });

  it('requires an auth dependency that can verify tokens', () => {
    expect(() =>
      createGetModerationVariantResponder({
        db: { collection: jest.fn() },
        auth: null,
      }),
    ).toThrow(new TypeError('auth.verifyIdToken must be a function'));
  });

  it('returns a missing authorization response when no header is present', async () => {
    const db = { collection: jest.fn() };
    const auth = { verifyIdToken: jest.fn() };
    const responder = createGetModerationVariantResponder({ db, auth });

    await expect(responder({})).resolves.toEqual({
      status: 401,
      body: 'Missing or invalid Authorization header',
    });
    expect(db.collection).not.toHaveBeenCalled();
    expect(auth.verifyIdToken).not.toHaveBeenCalled();
  });

  it('treats non-bearer headers as missing authorization', async () => {
    const db = { collection: jest.fn() };
    const auth = { verifyIdToken: jest.fn() };
    const responder = createGetModerationVariantResponder({ db, auth });

    await expect(
      responder(
        createRequestWithGet('Basic credentials'),
      ),
    ).resolves.toEqual({
      status: 401,
      body: 'Missing or invalid Authorization header',
    });
    expect(db.collection).not.toHaveBeenCalled();
  });

  it('propagates verification errors while sanitizing messages', async () => {
    const db = { collection: jest.fn() };
    const auth = {
      verifyIdToken: jest.fn().mockRejectedValue(new Error('Token expired')),
    };
    const responder = createGetModerationVariantResponder({ db, auth });

    await expect(
      responder(
        createRequestWithHeaders({ authorization: ['Bearer ' + token] }),
      ),
    ).resolves.toEqual({
      status: 401,
      body: 'Token expired',
    });
    expect(db.collection).not.toHaveBeenCalled();
  });

  it('accepts lowercase authorization headers from the request getter', async () => {
    const db = { collection: jest.fn() };
    const auth = { verifyIdToken: jest.fn().mockResolvedValue({}) };
    const responder = createGetModerationVariantResponder({ db, auth });

    const request = {
      get(name) {
        if (name === 'Authorization') {
          return undefined;
        }
        if (name === 'authorization') {
          return 'Bearer ' + token;
        }
        return undefined;
      },
    };

    await expect(responder(request)).resolves.toEqual({
      status: 401,
      body: 'Invalid or expired token',
    });
    expect(db.collection).not.toHaveBeenCalled();
  });

  it('falls back to the default message when verification errors are opaque', async () => {
    const db = { collection: jest.fn() };
    const auth = {
      verifyIdToken: jest.fn().mockRejectedValue({}),
    };
    const responder = createGetModerationVariantResponder({ db, auth });

    await expect(
      responder(createRequestWithHeaders({ authorization: ['Bearer ' + token] })),
    ).resolves.toEqual({
      status: 401,
      body: 'Invalid or expired token',
    });
    expect(db.collection).not.toHaveBeenCalled();
  });

  it('rejects tokens that do not yield a uid', async () => {
    const db = { collection: jest.fn() };
    const auth = { verifyIdToken: jest.fn().mockResolvedValue({}) };
    const responder = createGetModerationVariantResponder({ db, auth });

    await expect(
      responder(createRequestWithHeaders({ authorization: 'Bearer ' + token })),
    ).resolves.toEqual({
      status: 401,
      body: 'Invalid or expired token',
    });
    expect(db.collection).not.toHaveBeenCalled();
  });

  it('ignores non-string headers in the header map', async () => {
    const db = { collection: jest.fn() };
    const auth = { verifyIdToken: jest.fn() };
    const responder = createGetModerationVariantResponder({ db, auth });

    await expect(
      responder({ headers: { authorization: 123 } }),
    ).resolves.toEqual({
      status: 401,
      body: 'Missing or invalid Authorization header',
    });
    expect(db.collection).not.toHaveBeenCalled();
  });

  it('returns no job when the moderator document is missing', async () => {
    const moderatorSnap = { exists: false };
    const db = createDb(moderatorSnap);
    const auth = { verifyIdToken: jest.fn().mockResolvedValue({ uid: 'moderator-uid' }) };
    const responder = createGetModerationVariantResponder({ db, auth });

    await expect(
      responder(createRequestWithHeaders({ Authorization: 'Bearer ' + token })),
    ).resolves.toEqual({ status: 404, body: 'No moderation job' });
  });

  it('returns no job when the moderator lacks an assigned variant', async () => {
    const moderatorSnap = {
      exists: true,
      data: () => ({}),
    };
    const db = createDb(moderatorSnap);
    const auth = { verifyIdToken: jest.fn().mockResolvedValue({ uid: 'moderator-uid' }) };
    const responder = createGetModerationVariantResponder({ db, auth });

    await expect(
      responder(createRequestWithHeaders({ authorization: ['Bearer ' + token] })),
    ).resolves.toEqual({ status: 404, body: 'No moderation job' });
  });

  it('propagates variant level errors from Firestore', async () => {
    const variantNotFoundResponse = { status: 404, body: 'Variant not found' };
    const moderatorSnap = {
      exists: true,
      data: () => ({
        variant: {
          async get() {
            return { exists: false };
          },
        },
      }),
    };
    const db = createDb(moderatorSnap);
    const auth = { verifyIdToken: jest.fn().mockResolvedValue({ uid: 'moderator-uid' }) };
    const responder = createGetModerationVariantResponder({ db, auth });

    await expect(
      responder(createRequestWithHeaders({ authorization: 'Bearer ' + token })),
    ).resolves.toEqual(variantNotFoundResponse);
  });

  it('prefers header maps when the request getter does not return a string', async () => {
    const db = { collection: jest.fn() };
    const auth = { verifyIdToken: jest.fn().mockResolvedValue({}) };
    const responder = createGetModerationVariantResponder({ db, auth });

    const request = {
      get: () => 42,
      headers: { authorization: 'Bearer ' + token },
    };

    await expect(responder(request)).resolves.toEqual({
      status: 401,
      body: 'Invalid or expired token',
    });
    expect(db.collection).not.toHaveBeenCalled();
  });

  it('treats empty authorization arrays as missing headers', async () => {
    const db = { collection: jest.fn() };
    const auth = { verifyIdToken: jest.fn() };
    const responder = createGetModerationVariantResponder({ db, auth });

    const request = {
      headers: { authorization: [] },
    };

    await expect(responder(request)).resolves.toEqual({
      status: 401,
      body: 'Missing or invalid Authorization header',
    });
    expect(db.collection).not.toHaveBeenCalled();
  });

  it('returns an empty title when the variant lacks a page reference', async () => {
    const variantSnap = {
      exists: true,
      data: () => ({ content: 'Narrative', author: 'Author' }),
    };
    const variantRef = {
      async get() {
        return variantSnap;
      },
      collection() {
        return {
          async get() {
            return { docs: [] };
          },
        };
      },
      parent: {},
    };
    const moderatorSnap = {
      exists: true,
      data: () => ({ variant: variantRef }),
    };
    const db = createDb(moderatorSnap);
    const auth = { verifyIdToken: jest.fn().mockResolvedValue({ uid: 'moderator-uid' }) };
    const responder = createGetModerationVariantResponder({ db, auth });

    await expect(
      responder(createRequestWithHeaders({ authorization: 'Bearer ' + token })),
    ).resolves.toEqual({
      status: 200,
      body: {
        title: '',
        content: 'Narrative',
        author: 'Author',
        options: [],
      },
    });
  });

  it('returns an empty title when the story hierarchy is incomplete', async () => {
    const optionDocs = [
      { data: () => undefined },
      { data: () => ({ content: 'Second option', targetPageNumber: 3 }) },
    ];
    const variantSnap = {
      exists: true,
      data: () => undefined,
    };
    const variantRef = {
      async get() {
        return variantSnap;
      },
      collection(name) {
        expect(name).toBe('options');
        return {
          async get() {
            return { docs: optionDocs };
          },
        };
      },
      parent: {
        parent: {
          async get() {
            return {
              exists: true,
              ref: { parent: {} },
            };
          },
        },
      },
    };
    const moderatorSnap = {
      exists: true,
      data: () => ({ variant: variantRef }),
    };
    const db = createDb(moderatorSnap);
    const auth = { verifyIdToken: jest.fn().mockResolvedValue({ uid: 'moderator-uid' }) };
    const responder = createGetModerationVariantResponder({ db, auth });

    await expect(
      responder(createRequestWithGet('Bearer ' + token)),
    ).resolves.toEqual({
      status: 200,
      body: {
        title: '',
        content: '',
        author: '',
        options: [
          { content: '' },
          { content: 'Second option', targetPageNumber: 3 },
        ],
      },
    });
  });

  it('returns the normalized story when all Firestore documents exist', async () => {
    const storySnap = {
      exists: true,
      data: () => ({ title: 'Story Title' }),
    };
    const storyRef = {
      async get() {
        return storySnap;
      },
    };
    const pageSnap = {
      exists: true,
      ref: { parent: { parent: storyRef } },
    };
    const variantSnap = {
      exists: true,
      data: () => ({ content: 'Narrative', author: 'Author' }),
    };
    const variantRef = {
      async get() {
        return variantSnap;
      },
      collection(name) {
        expect(name).toBe('options');
        return {
          async get() {
            return {
              docs: [
                { data: () => ({ content: 'With target', targetPageNumber: 7 }) },
                { data: () => ({ content: 'Without target' }) },
              ],
            };
          },
        };
      },
      parent: {
        parent: {
          async get() {
            return { ...pageSnap };
          },
        },
      },
    };
    const moderatorSnap = {
      exists: true,
      data: () => ({ variant: variantRef }),
    };
    const db = createDb(moderatorSnap);
    const auth = { verifyIdToken: jest.fn().mockResolvedValue({ uid: 'moderator-uid' }) };
    const responder = createGetModerationVariantResponder({ db, auth });

    await expect(
      responder(createRequestWithHeaders({ authorization: 'Bearer ' + token })),
    ).resolves.toEqual({
      status: 200,
      body: {
        title: 'Story Title',
        content: 'Narrative',
        author: 'Author',
        options: [
          { content: 'With target', targetPageNumber: 7 },
          { content: 'Without target' },
        ],
      },
    });
  });

  it('returns an empty title when the page snapshot is missing', async () => {
    const variantSnap = {
      exists: true,
      data: () => ({ content: 'Narrative', author: 'Author' }),
    };
    const variantRef = {
      async get() {
        return variantSnap;
      },
      collection() {
        return {
          async get() {
            return { docs: [] };
          },
        };
      },
      parent: {
        parent: {
          async get() {
            return { exists: false };
          },
        },
      },
    };
    const moderatorSnap = {
      exists: true,
      data: () => ({ variant: variantRef }),
    };
    const db = createDb(moderatorSnap);
    const auth = { verifyIdToken: jest.fn().mockResolvedValue({ uid: 'moderator-uid' }) };
    const responder = createGetModerationVariantResponder({ db, auth });

    await expect(
      responder(createRequestWithHeaders({ authorization: 'Bearer ' + token })),
    ).resolves.toEqual({
      status: 200,
      body: {
        title: '',
        content: 'Narrative',
        author: 'Author',
        options: [],
      },
    });
  });

  it('returns an empty title when the story snapshot is missing', async () => {
    const storyRef = {
      async get() {
        return { exists: false };
      },
    };
    const pageSnap = {
      exists: true,
      ref: { parent: { parent: storyRef } },
    };
    const variantSnap = {
      exists: true,
      data: () => ({ content: 'Narrative', author: 'Author' }),
    };
    const variantRef = {
      async get() {
        return variantSnap;
      },
      collection() {
        return {
          async get() {
            return { docs: [] };
          },
        };
      },
      parent: {
        parent: {
          async get() {
            return pageSnap;
          },
        },
      },
    };
    const moderatorSnap = {
      exists: true,
      data: () => ({ variant: variantRef }),
    };
    const db = createDb(moderatorSnap);
    const auth = { verifyIdToken: jest.fn().mockResolvedValue({ uid: 'moderator-uid' }) };
    const responder = createGetModerationVariantResponder({ db, auth });

    await expect(
      responder(createRequestWithHeaders({ authorization: 'Bearer ' + token })),
    ).resolves.toEqual({
      status: 200,
      body: {
        title: '',
        content: 'Narrative',
        author: 'Author',
        options: [],
      },
    });
  });
});

it('re-exports the shared origin predicate', () => {
  expect(typeof isAllowedOrigin).toBe('function');
});
