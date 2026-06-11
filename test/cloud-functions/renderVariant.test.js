import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import {
  mockSave,
  mockFile,
  mockBucket,
  mockExists,
} from '@google-cloud/storage';
import { mockDoc } from 'firebase-admin/firestore';

const ACCESS_TOKEN_KEY = 'access_token';
const tenantDocFixtures = new Map();

/**
 * Create a mock collection reference.
 * @param {Array<{ data: () => Record<string, unknown> }>} docs Mock documents.
 * @returns {{ get: jest.Mock }} Mock collection reference.
 */
function createCollectionRef(docs = []) {
  return {
    get: jest.fn().mockResolvedValue({
      docs,
    }),
  };
}

/**
 * Create a mock tenant document reference.
 * @param {string} path Firestore document path.
 * @returns {{
 *   path: string,
 *   parent: { path: string, get: jest.Mock, parent: any } | null,
 *   get: jest.Mock,
 *   collection: jest.Mock
 * }} Mock document reference.
 */
function createTenantDocRef(path) {
  const fixture = tenantDocFixtures.get(path);
  const segments = String(path).split('/').filter(Boolean);
  const collectionDocs =
    fixture?.optionsData?.map(data => ({ data: () => data })) ?? [];
  const docRef = {
    path,
    parent: null,
    get: jest.fn().mockResolvedValue({
      exists: true,
      data: () => fixture?.data ?? createDefaultDataForPath(path),
    }),
    collection: jest.fn(name =>
      name === 'options'
        ? createCollectionRef(collectionDocs)
        : createCollectionRef()
    ),
  };

  if (segments.length >= 2) {
    const parentPath = segments.slice(0, -2).join('/');
    docRef.parent = {
      path: segments.slice(0, -1).join('/'),
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => createDefaultCollectionDataForPath(parentPath),
      }),
      parent: segments.length >= 4 ? createTenantDocRef(parentPath) : null,
    };
  }

  return docRef;
}

/**
 * Create default mock data for a Firestore document path.
 * @param {string} path Firestore document path.
 * @returns {Record<string, unknown>} Default document data.
 */
function createDefaultDataForPath(path) {
  if (/\/pages\/p\d+$/.test(path)) {
    return { number: Number(path.match(/\/pages\/p(\d+)$/)[1]) };
  }

  if (/\/variants\/[^/]+$/.test(path)) {
    return { name: 'a', content: 'content', incomingOption: false };
  }

  if (/\/stories\/[^/]+$/.test(path)) {
    return {
      title: 'Story',
      rootPage: createTenantDocRef(`${path}/pages/p1`),
    };
  }

  return {};
}

/**
 * Create default data for a mock collection path.
 * @param {string} path Firestore collection path.
 * @returns {{ docs: Array<never> }} Default collection data.
 */
function createDefaultCollectionDataForPath(path) {
  if (/\/variants$/.test(path)) {
    return { docs: [] };
  }

  return {};
}

/**
 * Load the cloud render entrypoint under tenant environment variables.
 * @returns {Promise<Function>} Render function.
 */
async function loadRender() {
  const originalEnv = {
    DENDRITE_ENVIRONMENT: process.env.DENDRITE_ENVIRONMENT,
    DATABASE_ID: process.env.DATABASE_ID,
  };

  process.env.DENDRITE_ENVIRONMENT = 't-123';
  process.env.DATABASE_ID = 't-123';

  try {
    jest.resetModules();
    const getFirestore = jest.fn(() => ({
      doc: mockDoc,
      collection: jest.fn(() => createCollectionRef()),
      collectionGroup: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
      })),
    }));
    const Storage = jest.fn(function Storage() {
      return {
        bucket: jest.fn(() => ({
          file: mockFile,
        })),
      };
    });
    const functions = {
      region: jest.fn(() => ({
        firestore: {
          document: jest.fn(() => ({
            onWrite: jest.fn(handler => handler),
          })),
        },
        https: {
          onRequest: jest.fn(handler => handler),
        },
      })),
    };
    const createFirebaseAppManager = jest.fn(() => ({
      ensureFirebaseApp: jest.fn(),
    }));
    const getEnvironmentVariables = jest.fn(() => ({
      DENDRITE_ENVIRONMENT: 't-123',
      DATABASE_ID: 't-123',
    }));
    const fetchFn = jest.fn();
    const crypto = { randomUUID: jest.fn(() => 'uuid') };
    mockDoc.mockImplementation(path => createTenantDocRef(path));

    await jest.unstable_mockModule(
      '../../src/cloud/render-variant/firebase-functions.js',
      () => ({
        default: {
          region: jest.fn(() => ({
            firestore: {
              document: jest.fn(() => ({
                onWrite: jest.fn(handler => handler),
              })),
            },
            https: {
              onRequest: jest.fn(handler => handler),
            },
          })),
        },
      })
    );
    await jest.unstable_mockModule(
      '../../src/cloud/render-variant/render-variant-gcf.js',
      () => ({
        functions,
        FieldValue: {
          delete: jest.fn(() => 'DELETE'),
        },
        Storage,
        createFirebaseAppManager,
        getFirestoreInstance: getFirestore,
        getEnvironmentVariables,
        fetchFn,
        crypto,
        initializeApp: jest.fn(),
      })
    );
    const mod = await import('../../src/cloud/render-variant/index.js');
    return mod.render;
  } finally {
    if (originalEnv.DENDRITE_ENVIRONMENT === undefined) {
      delete process.env.DENDRITE_ENVIRONMENT;
    } else {
      process.env.DENDRITE_ENVIRONMENT = originalEnv.DENDRITE_ENVIRONMENT;
    }

    if (originalEnv.DATABASE_ID === undefined) {
      delete process.env.DATABASE_ID;
    } else {
      process.env.DATABASE_ID = originalEnv.DATABASE_ID;
    }
  }
}

/**
 * Create a mock Firestore snapshot for the render function tests.
 * @param {Array<object>} optionData Option documents exposed by the snapshot.
 * @returns {object} Mock snapshot shaped like a Firestore variant document.
 */
function createSnap(optionData) {
  const optionsDocs = optionData.map(d => ({ data: () => d }));
  tenantDocFixtures.set('stories/s1/pages/p5/variants/v1', {
    data: () => snap.data(),
    optionsData: optionData,
  });
  const optionsCollection = {
    get: jest.fn().mockResolvedValue({ docs: optionsDocs }),
  };
  const rootVariantCollection = {
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({
      empty: false,
      docs: [{ data: () => ({ name: 'a' }) }],
    }),
  };
  const rootPageRef = {
    get: jest.fn().mockResolvedValue({
      exists: true,
      data: () => ({ number: 1 }),
    }),
    collection: jest.fn(() => rootVariantCollection),
  };
  const storyRef = {
    get: jest.fn().mockResolvedValue({
      exists: true,
      data: () => ({ rootPage: rootPageRef, title: 'Story' }),
    }),
  };
  const pagesCollection = { parent: storyRef };
  const pageRef = { parent: pagesCollection };
  const pageSnap = {
    exists: true,
    data: () => ({ number: 5, incomingOption: true }),
    ref: pageRef,
  };
  pageRef.get = jest.fn().mockResolvedValue(pageSnap);
  const variantsCollection = {
    get: jest.fn().mockResolvedValue({ docs: [] }),
    parent: pageRef,
  };
  return {
    data: () => ({ name: 'a', content: 'content', incomingOption: false }),
    ref: {
      path: 'stories/s1/pages/p5/variants/v1',
      parent: variantsCollection,
      collection: jest.fn(() => optionsCollection),
    },
  };
}

describe('render', () => {
  beforeEach(() => {
    tenantDocFixtures.clear();
    mockSave.mockClear();
    mockFile.mockClear();
    mockBucket.mockClear();
    mockExists.mockClear();
    mockDoc.mockReset();
    mockDoc.mockImplementation(path => createTenantDocRef(path));
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ [ACCESS_TOKEN_KEY]: 'token' }),
      })
      .mockResolvedValue({ ok: true });
  });

  test('sets cache control when variant open', async () => {
    const render = await loadRender();
    const snap = createSnap([{ content: 'Go', position: 0 }]);
    await render(snap, { params: { storyId: 's1', variantId: 'v1' } });
    expect(mockSave.mock.calls[0][1]).toMatchObject({
      contentType: 'text/html',
      metadata: { cacheControl: 'no-store' },
    });
  });

  test('omits cache control when variant closed', async () => {
    const render = await loadRender();
    const snap = createSnap([
      { content: 'Go', position: 0, targetPageNumber: 2 },
    ]);
    await render(snap, { params: { storyId: 's1', variantId: 'v1' } });
    expect(mockSave.mock.calls[0][1]).toEqual({ contentType: 'text/html' });
  });

  test('includes data-variants for options linking to multi-variant page', async () => {
    const render = await loadRender();
    const variantCollection = {
      orderBy: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        empty: false,
        docs: [
          { data: () => ({ name: 'a', visibility: 1 }) },
          { data: () => ({ name: 'b', visibility: 1 }) },
        ],
      }),
    };
    const targetPageRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ number: 10 }),
      }),
      collection: jest.fn(() => variantCollection),
    };
    const snap = createSnap([
      { content: 'Go', position: 0, targetPage: targetPageRef },
    ]);
    await render(snap, { params: { storyId: 's1', variantId: 'v1' } });
    const html = mockSave.mock.calls[0][0];
    expect(html).toContain(
      '<li><a class="variant-link" data-link-id="5-a-0" href="/p/10a.html" data-variants="10a:1,10b:1">Go</a></li>'
    );
  });

  test('logs error when cache invalidation fails', async () => {
    const render = await loadRender();
    const snap = createSnap([{ content: 'Go', position: 0 }]);
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ [ACCESS_TOKEN_KEY]: 'token' }),
      })
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue({ ok: false, status: 500 });

    await render(snap, { params: { storyId: 's1', variantId: 'v1' } });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  test('invalidates parent variant when incoming option', async () => {
    const render = await loadRender();
    const snap = createSnap([{ content: 'Go', position: 0 }]);
    snap.data = () => ({
      name: 'a',
      content: 'content',
      incomingOption: 'stories/s1/pages/p1/variants/pv/options/o1',
    });

    const parentPageRef = {
      path: 'stories/s1/pages/p1',
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ number: 2 }),
      }),
      parent: { path: 'stories/s1/pages', parent: null },
      collection: jest.fn(() => createCollectionRef()),
    };
    const parentVariantRef = {
      path: 'stories/s1/pages/p1/variants/pv',
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ name: 'b' }),
      }),
      collection: jest.fn(() => createCollectionRef()),
      parent: { parent: parentPageRef },
    };
    mockDoc.mockReturnValue({
      parent: {
        path: 'stories/s1/pages/p1/variants',
        parent: parentVariantRef,
      },
      get: jest
        .fn()
        .mockResolvedValue({ exists: true, data: () => ({ position: 4 }) }),
      collection: jest.fn(() => createCollectionRef()),
    });

    await render(snap, { params: { storyId: 's1', variantId: 'v1' } });

    const pathCalls = fetch.mock.calls
      .slice(1)
      .map(([, opts]) => JSON.parse(opts.body).path);
    expect(pathCalls).toContain('/p/2b.html');
  });

  test('adds navigation links for non-root variant', async () => {
    const render = await loadRender();
    const snap = createSnap([{ content: 'Go', position: 0 }]);
    snap.data = () => ({
      name: 'a',
      content: 'content',
      incomingOption: 'stories/s1/pages/p1/variants/pv/options/o1',
    });

    const parentPageRef = {
      path: 'stories/s1/pages/p1',
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ number: 7 }),
      }),
      parent: { path: 'stories/s1/pages', parent: null },
      collection: jest.fn(() => createCollectionRef()),
    };
    const parentVariantRef = {
      path: 'stories/s1/pages/p1/variants/pv',
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ name: 'b' }),
      }),
      collection: jest.fn(() => createCollectionRef()),
      parent: { parent: parentPageRef },
    };
    mockDoc.mockReturnValue({
      parent: {
        path: 'stories/s1/pages/p1/variants',
        parent: parentVariantRef,
      },
      get: jest
        .fn()
        .mockResolvedValue({ exists: true, data: () => ({ position: 2 }) }),
      collection: jest.fn(() => createCollectionRef()),
    });

    await render(snap, { params: { storyId: 's1', variantId: 'v1' } });
    const html = mockSave.mock.calls[0][0];
    expect(html).toContain('<a href="/p/7b.html">Back</a>');
  });

  test('includes story title in head title for non-root pages', async () => {
    const render = await loadRender();
    const snap = createSnap([{ content: 'Go', position: 0 }]);
    snap.data = () => ({
      name: 'a',
      content: 'content',
      incomingOption: 'stories/s1/pages/p1/variants/pv/options/o1',
    });

    const parentPageRef = {
      path: 'stories/s1/pages/p1',
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ number: 7 }),
      }),
      parent: { path: 'stories/s1/pages', parent: null },
      collection: jest.fn(() => createCollectionRef()),
    };
    const parentVariantRef = {
      path: 'stories/s1/pages/p1/variants/pv',
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ name: 'b' }),
      }),
      collection: jest.fn(() => createCollectionRef()),
      parent: { parent: parentPageRef },
    };
    mockDoc.mockReturnValue({
      parent: {
        path: 'stories/s1/pages/p1/variants',
        parent: parentVariantRef,
      },
      get: jest
        .fn()
        .mockResolvedValue({ exists: true, data: () => ({ position: 2 }) }),
      collection: jest.fn(() => createCollectionRef()),
    });

    await render(snap, { params: { storyId: 's1', variantId: 'v1' } });
    const html = mockSave.mock.calls[0][0];
    expect(html).toContain('<title>Dendrite</title>');
  });

  test('includes rewrite link with page parameter', async () => {
    const render = await loadRender();
    const snap = createSnap([{ content: 'Go', position: 0 }]);
    await render(snap, { params: { storyId: 's1', variantId: 'v1' } });
    const html = mockSave.mock.calls[0][0];
    expect(html).toContain(
      '<a href="../new-page.html?page=5">Rewrite</a> <a href="./5-alts.html">Other variants</a>'
    );
  });

  test('creates author page and links to it', async () => {
    const render = await loadRender();
    const snap = createSnap([{ content: 'Go', position: 0 }]);
    snap.data = () => ({
      name: 'a',
      content: 'content',
      incomingOption: false,
      authorId: 'auth1',
      authorName: 'Alice',
    });
    mockDoc.mockReturnValue({
      path: 'stories/s1/pages/p5/variants/v1',
      get: jest
        .fn()
        .mockResolvedValue({ exists: true, data: () => ({ uuid: 'u123' }) }),
      collection: jest.fn(() => createCollectionRef()),
      parent: {
        path: 'stories/s1/pages/p5/variants',
        parent: { path: 'stories/s1/pages/p5', parent: null },
        get: jest.fn().mockResolvedValue({ docs: [] }),
      },
    });
    await render(snap, { params: { storyId: 's1', variantId: 'v1' } });
    const htmlCalls = mockSave.mock.calls.map(([html]) => html);
    expect(
      htmlCalls.some(html => html.includes('<a href="/a/u123.html">Alice</a>'))
    ).toBe(true);
    expect(htmlCalls.some(html => html.includes('<h1>Alice</h1>'))).toBe(true);
  });
});
