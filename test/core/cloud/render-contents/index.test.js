import { jest } from '@jest/globals';

await jest.unstable_mockModule(
  '../../../../src/core/cloud/render-contents/render-contents-core.js',
  () => ({
    DEFAULT_BUCKET_NAME: 'bucket',
    buildHtml: jest.fn(() => 'html'),
    buildHandleRenderRequest:
      ({ verifyIdToken, render }) =>
      async (request, response) => {
        await render();
        await verifyIdToken(request.headers.authorization.slice(7));
        response.status(200);
      },
    createApplyCorsHeaders: jest.fn(() => jest.fn()),
    createFetchStoryInfo: db => async storyId => {
      const snapshot = await db.collection('stories').doc(storyId).get();
      const data = snapshot.data();
      const rootPage = await data.rootPage.get();
      return { title: data.title, pageNumber: rootPage.data().number };
    },
    createFetchTopStoryIds: db => async () => {
      const result = await db
        .collection('storyStats')
        .orderBy('score')
        .limit(10)
        .get();
      return result.docs.map(doc => doc.id);
    },
    createRenderContents: jest.fn(() => jest.fn().mockResolvedValue(undefined)),
    createValidateRequest: jest.fn(() => jest.fn(() => true)),
    getAllowedOrigins: jest.fn(() => []),
    resolveStaticBucketName: jest.fn(() => 'bucket'),
    resolveStaticObjectPrefix: jest.fn(() => 'prefix'),
  })
);
await jest.unstable_mockModule('../../../../src/core/cloud/render-support.js', () => ({
  createCloudRenderInstanceBuilder: ({ createRenderer, consoleError }) => {
    consoleError('builder');
    return jest.fn(() => createRenderer());
  },
  createMemoizedLoader: factory => {
    let value;
    return () => (value ??= factory());
  },
  createCloudRenderEntrypointState: options => ({
    db: options.getFirestoreInstance(),
    environmentVariables: options.getEnvironmentVariables(),
    render: () => options.buildRender(),
  }),
}));
const { createRenderContentsEntrypoint } = await import(
  '../../../../src/core/cloud/render-contents/index.js'
);

describe('createRenderContentsEntrypoint', () => {
  test('wires the entrypoint helpers and handlers', async () => {
    const originalFetch = global.fetch;
    const docs = [{ id: 'one' }];
    const storyDoc = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          title: 'Story',
          rootPage: {
            get: jest.fn().mockResolvedValue({
              exists: true,
              data: () => ({ number: 1 }),
            }),
          },
        }),
      }),
    };
    const db = {
      collection: jest.fn(name => {
        if (name === 'storyStats') {
          return {
            orderBy: jest.fn(() => ({
              limit: jest.fn(() => ({
                get: jest.fn().mockResolvedValue({ docs }),
              })),
            })),
          };
        }

        return {
          doc: () => storyDoc,
        };
      }),
    };
    const auth = {
      verifyIdToken: jest.fn().mockResolvedValue({ uid: 'admin' }),
    };
    class Storage {
      bucket() {
        return {
          file: jest.fn(() => ({
            save: jest.fn().mockResolvedValue(undefined),
          })),
        };
      }
    }
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token' }),
      })
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    global.fetch = fetchFn;
    const createFirebaseAppManager = jest.fn(() => ({
      ensureFirebaseApp: jest.fn(),
      resetFirebaseInitializationState: jest.fn(),
    }));
    const functions = {
      region: jest.fn(() => ({
        firestore: {
          document: jest.fn(() => ({
            onCreate(handler) {
              return handler;
            },
          })),
        },
        https: {
          onRequest(handler) {
            return handler;
          },
        },
      })),
    };
    const entrypoint = createRenderContentsEntrypoint({
      initializeApp: jest.fn(),
      functions,
      Storage,
      getAuth: jest.fn(() => auth),
      createFirebaseAppManager,
      getFirestoreInstance: jest.fn(() => db),
      ADMIN_UID: 'admin',
      fetchFn,
      crypto: { randomUUID: () => 'uuid' },
      getEnvironmentVariables: jest.fn(() => ({
        DENDRITE_ENVIRONMENT: 'dev',
      })),
    });

    await expect(entrypoint.fetchTopStoryIds()).resolves.toEqual(['one']);
    await expect(entrypoint.fetchStoryInfo('story')).resolves.toEqual({
      title: 'Story',
      pageNumber: 1,
    });

    await entrypoint.handle(
      {
        data: () => ({
          title: 'Story',
          pageNumber: 1,
        }),
      },
      {}
    );

    const response = {
      set: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn(),
    };
    try {
      await entrypoint.handleTrigger(
        {
          method: 'POST',
          headers: {
            authorization: 'Bearer token',
          },
          get: jest.fn(),
        },
        response
      );

      expect(auth.verifyIdToken).toHaveBeenCalledWith('token');
      expect(response.status).toHaveBeenCalledWith(200);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
