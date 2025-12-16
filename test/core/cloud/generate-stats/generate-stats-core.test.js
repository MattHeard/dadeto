import { jest } from '@jest/globals';

const ACCESS_TOKEN_KEY = 'access_token';
import {
  createGenerateStatsCore,
  isDuplicateAppError,
  initializeFirebaseApp,
  getProjectFromEnv,
  getUrlMapFromEnv,
  getCdnHostFromEnv,
  buildHtml,
} from '../../../../src/core/cloud/generate-stats/generate-stats-core.js';
import {
  DEFAULT_BUCKET_NAME,
  matchAuthHeader,
} from '../../../../src/core/cloud/cloud-core.js';
import { ADMIN_UID } from '../../../../src/core/commonCore.js';

describe('createGenerateStatsCore', () => {
  let mockDb;
  let mockAuth;
  let mockStorage;
  let mockFetchFn;
  let mockEnv;
  let mockUrlMap;
  let mockCryptoModule;
  let core;

  let mockConsoleError;

  beforeEach(() => {
    mockDb = {
      collection: () => mockDb,
      collectionGroup: () => mockDb,
      count: () => mockDb,
      get: () => Promise.resolve({ data: () => ({ count: 0 }) }),
      doc: () => mockDb,
      where: () => mockDb,
      orderBy: () => mockDb,
      limit: () => mockDb,
    };
    mockAuth = {
      verifyIdToken: () => Promise.resolve({ uid: 'some-uid' }),
    };
    mockStorage = {
      bucket: () => mockStorage,
      file: () => mockStorage,
      save: () => Promise.resolve(),
    };
    mockFetchFn = jest.fn(); // Make mockFetchFn a Jest mock function
    mockEnv = {};
    mockUrlMap = 'some-url-map';
    mockCryptoModule = { randomUUID: () => 'some-uuid' };
    mockConsoleError = jest.fn(); // Initialize mockConsoleError
    const mockConsole = { error: mockConsoleError }; // Create mockConsole object

    core = createGenerateStatsCore({
      db: mockDb,
      auth: mockAuth,
      storage: mockStorage,
      fetchFn: mockFetchFn,
      env: mockEnv,
      urlMap: mockUrlMap,
      cryptoModule: mockCryptoModule,
      console: mockConsole, // Inject mockConsole
      createVerifyAdmin: deps => {
        return async (req, res) => {
          const token = extractTokenFromRequest(deps, req);
          if (!token) {
            deps.sendUnauthorized(res, 'Missing token');
            return false;
          }
          return authorizeToken(deps, token, res);
        };
      },
    });
  });

  /**
   * Extract the bearer token from the request using the injected helpers.
   * @param {{ getAuthHeader: (req: object) => string }} deps Dependency bundle supplied to helpers.
   * @param {object} req Request object containing headers.
   * @returns {string} Bearer token or an empty string.
   */
  function extractTokenFromRequest(deps, req) {
    const authHeader = deps.getAuthHeader(req);
    const match = matchAuthHeader(authHeader);
    return match?.[1] || '';
  }

  /**
   * Validate the decoded token and ensure the caller is an admin.
   * @param {{
   *   verifyToken: (token: string) => Promise<{ uid?: string }>,
   *   isAdminUid: (decoded: { uid?: string }) => boolean,
   *   sendForbidden: (res: object) => void,
   *   sendUnauthorized: (res: object, message: string) => void,
   * }} deps Dependency bundle.
   * @param {string} token Bearer token to validate.
   * @param {object} res Response helper used to send errors.
   * @returns {Promise<boolean>} True when the token is valid and the user is admin.
   */
  async function authorizeToken(deps, token, res) {
    try {
      const decoded = await deps.verifyToken(token);
      if (!deps.isAdminUid(decoded)) {
        deps.sendForbidden(res);
        return false;
      }
      return true;
    } catch (error) {
      const candidate = error?.message;
      const message =
        typeof candidate === 'string' ? candidate : 'Invalid token';
      deps.sendUnauthorized(res, message);
      return false;
    }
  }

  describe('handleRequest', () => {
    let mockReq;
    let mockRes;

    const createDbMock = () => {
      let variantIndex = 0;
      const counts = [2, 1];
      return {
        _collectionName: null,
        _collectionGroupName: null,
        _docId: null,
        collection(name) {
          this._collectionName = name;
          this._collectionGroupName = null;
          return this;
        },
        collectionGroup(name) {
          this._collectionGroupName = name;
          this._collectionName = null;
          if (name === 'variants') {
            variantIndex = 0;
          }
          return this;
        },
        count() {
          if (this._collectionName === 'stories') {
            return {
              get: () => Promise.resolve({ data: () => ({ count: 4 }) }),
            };
          }

          if (this._collectionGroupName === 'pages') {
            return {
              get: () => Promise.resolve({ data: () => ({ count: 7 }) }),
            };
          }

          if (this._collectionGroupName === 'variants') {
            return {
              get: () =>
                Promise.resolve({
                  data: () => ({ count: counts[variantIndex++] ?? 0 }),
                }),
            };
          }

          return {
            get: () => Promise.resolve({ data: () => ({ count: 0 }) }),
          };
        },
        where() {
          return this;
        },
        orderBy() {
          return this;
        },
        limit() {
          return this;
        },
        doc(id) {
          this._docId = id;
          return this;
        },
        get() {
          if (this._collectionName === 'storyStats') {
            return Promise.resolve({
              docs: [
                { id: 'story1', data: () => ({ variantCount: 5 }) },
                { id: 'story2', data: () => ({}) },
              ],
            });
          }

          if (this._collectionName === 'stories') {
            return Promise.resolve({
              data: () =>
                this._docId === 'story1' ? { title: 'Story One' } : {},
            });
          }

          return Promise.resolve({ data: () => ({}) });
        },
      };
    };

    const createStorageMock = ({ failSave = false, errorValue } = {}) => {
      const save = failSave
        ? jest.fn(() =>
            Promise.reject(errorValue ?? new Error('Generation failed'))
          )
        : jest.fn(() => Promise.resolve());
      const file = jest.fn(() => ({ save }));
      const bucket = jest.fn(() => ({ file }));
      return { bucket, __mocks: { save, file, bucket } };
    };

    const createFetchMock = ({
      metadataResponse = {
        ok: true,
        json: async () => ({ [ACCESS_TOKEN_KEY]: 'token-123' }),
      },
      invalidateResponse = { ok: true },
    } = {}) => {
      const fetchFn = jest.fn();
      fetchFn.mockResolvedValueOnce(metadataResponse);
      fetchFn.mockResolvedValueOnce(invalidateResponse);
      return fetchFn;
    };

    const buildCoreForHandleRequest = ({ auth, storage, fetchFn, db } = {}) => {
      const authInstance = auth || {
        verifyIdToken: jest.fn(() => Promise.resolve({ uid: ADMIN_UID })),
      };
      const storageInstance = storage || createStorageMock();
      const fetchInstance = fetchFn || createFetchMock();
      const dbInstance = db || createDbMock();
      const consoleError = jest.fn();

      const coreInstance = createGenerateStatsCore({
        db: dbInstance,
        auth: authInstance,
        storage: storageInstance,
        fetchFn: fetchInstance,
        env: {},
        urlMap: 'test-url-map',
        cryptoModule: { randomUUID: jest.fn(() => 'uuid-123') },
        console: { error: consoleError },
      });

      return {
        coreInstance,
        storageInstance,
        fetchInstance,
        authInstance,
        consoleError,
      };
    };

    beforeEach(() => {
      mockReq = {
        method: 'POST',
        get: header => {
          if (header === 'X-Appengine-Cron') {
            return mockReq.isCron;
          }
          if (header === 'Authorization') {
            return mockReq.authorization;
          }
          return undefined;
        },
        isCron: undefined,
        authorization: undefined,
      };
      mockRes = {
        status: code => {
          mockRes.statusCode = code;
          return mockRes;
        },
        send: message => {
          mockRes.message = message;
        },
        json: data => {
          mockRes.jsonResponse = data;
        },
        statusCode: 200,
        message: '',
        jsonResponse: null,
      };
    });

    it('should return 405 for non-POST requests', async () => {
      const { coreInstance } = buildCoreForHandleRequest();
      mockReq.method = 'GET';
      await coreInstance.handleRequest(mockReq, mockRes);
      expect(mockRes.statusCode).toBe(405);
      expect(mockRes.message).toBe('POST only');
    });

    it('should succeed if X-Appengine-Cron header is true', async () => {
      const { coreInstance, fetchInstance } = buildCoreForHandleRequest();
      mockReq.isCron = 'true';
      await coreInstance.handleRequest(mockReq, mockRes);
      expect(mockRes.statusCode).toBe(200);
      expect(mockRes.jsonResponse).toEqual({ ok: true });
      expect(fetchInstance).toHaveBeenCalledTimes(2);
    });

    it('should return 401 if not cron and not authorized (missing token)', async () => {
      const { coreInstance } = buildCoreForHandleRequest();
      mockReq.isCron = 'false';
      mockReq.authorization = undefined; // No authorization header
      await coreInstance.handleRequest(mockReq, mockRes);
      expect(mockRes.statusCode).toBe(401);
      expect(mockRes.message).toBe('Missing token');
    });

    it('should return 401 if not cron and not authorized (invalid token)', async () => {
      const auth = {
        verifyIdToken: jest.fn(() =>
          Promise.reject(new Error('Firebase ID token has invalid signature.'))
        ),
      };
      const { coreInstance } = buildCoreForHandleRequest({ auth });
      mockReq.isCron = 'false';
      mockReq.authorization = 'Bearer invalid-token';
      await coreInstance.handleRequest(mockReq, mockRes);
      expect(mockRes.statusCode).toBe(401);
      expect(mockRes.message).toBe('Firebase ID token has invalid signature.');
    });

    it('should return 403 if not cron and user is not admin', async () => {
      const auth = {
        verifyIdToken: jest.fn(() => Promise.resolve({ uid: 'not-admin' })),
      };
      const { coreInstance } = buildCoreForHandleRequest({ auth });
      mockReq.isCron = 'false';
      mockReq.authorization = 'Bearer valid-token';
      await coreInstance.handleRequest(mockReq, mockRes);
      expect(mockRes.statusCode).toBe(403);
      expect(mockRes.message).toBe('Forbidden');
    });

    it('should succeed if not cron and authorized admin', async () => {
      const auth = {
        verifyIdToken: jest.fn(() => Promise.resolve({ uid: ADMIN_UID })),
      };
      const { coreInstance, fetchInstance } = buildCoreForHandleRequest({
        auth,
      });
      mockReq.isCron = 'false';
      mockReq.authorization = 'Bearer valid-token';
      await coreInstance.handleRequest(mockReq, mockRes);
      expect(mockRes.statusCode).toBe(200);
      expect(mockRes.jsonResponse).toEqual({ ok: true });
      expect(fetchInstance).toHaveBeenCalledTimes(2);
    });

    it('should return 500 when generate rejects', async () => {
      const storage = createStorageMock({ failSave: true });
      const { coreInstance } = buildCoreForHandleRequest({ storage });
      mockReq.isCron = 'true';
      await coreInstance.handleRequest(mockReq, mockRes);
      expect(mockRes.statusCode).toBe(500);
      expect(mockRes.jsonResponse).toEqual({ error: 'Generation failed' });
    });

    it('returns the fallback message when generate throws without a message', async () => {
      const storage = createStorageMock({
        failSave: true,
        errorValue: { reason: 'timeout' },
      });
      const { coreInstance } = buildCoreForHandleRequest({ storage });
      mockReq.isCron = 'true';
      await coreInstance.handleRequest(mockReq, mockRes);
      expect(mockRes.statusCode).toBe(500);
      expect(mockRes.jsonResponse).toEqual({ error: 'generate failed' });
    });
  });

  describe('data fetching functions', () => {
    it('getStoryCount should return the correct count', async () => {
      mockDb.get = () => Promise.resolve({ data: () => ({ count: 5 }) });
      const count = await core.getStoryCount();
      expect(count).toBe(5);
    });

    it('getPageCount should return the correct count', async () => {
      mockDb.get = () => Promise.resolve({ data: () => ({ count: 10 }) });
      const count = await core.getPageCount();
      expect(count).toBe(10);
    });

    it('getStoryCount accepts a custom database reference', async () => {
      const customDb = {
        collection: () => customDb,
        count: () => customDb,
        get: () => Promise.resolve({ data: () => ({ count: 8 }) }),
      };
      const count = await core.getStoryCount(customDb);
      expect(count).toBe(8);
    });

    it('getPageCount accepts a custom database reference', async () => {
      const customDb = {
        collectionGroup: () => customDb,
        count: () => customDb,
        get: () => Promise.resolve({ data: () => ({ count: 12 }) }),
      };
      const count = await core.getPageCount(customDb);
      expect(count).toBe(12);
    });

    it('getUnmoderatedPageCount should return the correct count', async () => {
      let callCount = 0;
      mockDb.get = () => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ data: () => ({ count: 2 }) }); // zeroSnap
        } else {
          return Promise.resolve({ data: () => ({ count: 1 }) }); // nullSnap
        }
      };
      const count = await core.getUnmoderatedPageCount();
      expect(count).toBe(3);
    });

    it('getTopStories normalizes missing metadata', async () => {
      const statsDocs = [
        { id: 'story1', data: () => ({ variantCount: 5 }) },
        { id: 'story2', data: () => ({}) },
      ];

      const storiesDocs = {
        story1: { data: () => ({ title: 'Story One' }) },
        story2: { data: () => ({}) },
      };

      const collectionMock = name => {
        mockDb._collectionName = name;
        return mockDb;
      };

      const docMock = id => {
        mockDb._docId = id;
        return mockDb;
      };

      const getMock = () => {
        if (mockDb._collectionName === 'storyStats') {
          return Promise.resolve({ docs: statsDocs });
        }

        if (mockDb._collectionName === 'stories') {
          return Promise.resolve(
            storiesDocs[mockDb._docId] ?? { data: () => ({}) }
          );
        }

        return Promise.resolve({ data: () => ({}) });
      };

      mockDb.collection = collectionMock;
      mockDb.doc = docMock;
      mockDb.get = getMock;

      const recordedLimit = { value: null };
      const originalLimit = mockDb.limit.bind(mockDb);
      mockDb.limit = limit => {
        recordedLimit.value = limit;
        return originalLimit(limit);
      };

      const topStories = await core.getTopStories(mockDb, 10);
      expect(topStories).toEqual([
        { title: 'Story One', variantCount: 5 },
        { title: 'story2', variantCount: 0 },
      ]);
      expect(recordedLimit.value).toBe(10);
    });
  });

  describe('generate', () => {
    it('should generate and save HTML, then invalidate paths', async () => {
      const mockStorageInstance = {
        bucket: () => mockStorageInstance,
        file: () => mockStorageInstance,
        save: () => {
          mockStorageInstance.saveCalled = true;
          return Promise.resolve();
        },
        saveCalled: false,
      };
      const mockInvalidatePathsFn = paths => {
        mockInvalidatePathsFn.paths = paths;
        mockInvalidatePathsFn.called = true;
        return Promise.resolve();
      };
      mockInvalidatePathsFn.called = false;
      mockInvalidatePathsFn.paths = [];

      const variantCounts = [2, 1];
      const storiesCollection = {
        count: jest.fn(() => ({
          get: jest.fn(() => Promise.resolve({ data: () => ({ count: 4 }) })),
        })),
        doc: jest.fn(id => ({
          get: jest.fn(() =>
            Promise.resolve(
              id === 'story1'
                ? { data: () => ({ title: 'Story One' }) }
                : { data: () => ({}) }
            )
          ),
        })),
      };

      const storyStatsCollection = {
        orderBy: jest.fn(() => ({
          limit: jest.fn(() => ({
            get: jest.fn(() =>
              Promise.resolve({
                docs: [
                  { id: 'story1', data: () => ({ variantCount: 5 }) },
                  { id: 'story2', data: () => ({}) },
                ],
              })
            ),
          })),
        })),
      };

      const db = {
        collection: jest.fn(name => {
          if (name === 'stories') {
            return storiesCollection;
          }
          if (name === 'storyStats') {
            return storyStatsCollection;
          }
          throw new Error(`Unexpected collection ${name}`);
        }),
        collectionGroup: jest.fn(name => {
          if (name === 'pages') {
            return {
              count: jest.fn(() => ({
                get: jest.fn(() =>
                  Promise.resolve({ data: () => ({ count: 7 }) })
                ),
              })),
            };
          }

          if (name === 'variants') {
            let index = 0;
            return {
              where: jest.fn(() => ({
                count: jest.fn(() => ({
                  get: jest.fn(() =>
                    Promise.resolve({
                      data: () => ({ count: variantCounts[index++] ?? 0 }),
                    })
                  ),
                })),
              })),
            };
          }

          throw new Error(`Unexpected collectionGroup ${name}`);
        }),
      };

      const saveMock = jest.fn(() => Promise.resolve());
      const fileMock = jest.fn(() => ({ save: saveMock }));
      const bucketMock = jest.fn(() => ({ file: fileMock }));
      const storage = { bucket: bucketMock };

      const fetchFn = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ [ACCESS_TOKEN_KEY]: 'token-123' }),
        })
        .mockResolvedValueOnce({ ok: true });

      const cryptoModule = { randomUUID: jest.fn(() => 'uuid-123') };

      const testCore = createGenerateStatsCore({
        db,
        auth: { verifyIdToken: jest.fn() },
        storage,
        fetchFn,
        env: {},
        cryptoModule,
      });

      await testCore.generate();

      expect(bucketMock).toHaveBeenCalledWith(DEFAULT_BUCKET_NAME);
      expect(fileMock).toHaveBeenCalledWith('stats.html');
      expect(saveMock).toHaveBeenCalledTimes(1);

      const savedHtml = saveMock.mock.calls[0][0];
      expect(savedHtml).toContain('Number of stories: 4');
      expect(savedHtml).toContain('Number of pages: 7');
      expect(savedHtml).toContain('Story One');
      expect(savedHtml).toContain('story2');

      const saveOptions = saveMock.mock.calls[0][1];
      expect(saveOptions).toEqual({
        contentType: 'text/html',
        metadata: { cacheControl: 'no-cache' },
      });

      expect(fetchFn).toHaveBeenCalledTimes(2);
      const invalidateCall = fetchFn.mock.calls[1];
      const invalidateBody = JSON.parse(invalidateCall[1].body);
      expect(invalidateBody).toEqual({
        host: 'www.dendritestories.co.nz',
        path: '/stats.html',
        requestId: 'uuid-123',
      });
    });
  });

  describe('getAccessTokenFromMetadata', () => {
    it('should return an access token', async () => {
      mockFetchFn.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({ [ACCESS_TOKEN_KEY]: 'test-access-token' }),
        })
      );
      const token = await core.getAccessTokenFromMetadata();
      expect(token).toBe('test-access-token');
    });

    it('should throw an error if fetch is not ok', async () => {
      mockFetchFn.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 404,
        })
      );
      await expect(core.getAccessTokenFromMetadata()).rejects.toThrow(
        'metadata token: HTTP 404'
      );
    });
  });

  describe('invalidatePaths', () => {
    it('should invalidate paths successfully', async () => {
      mockFetchFn.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({ [ACCESS_TOKEN_KEY]: 'test-access-token' }),
        })
      );
      mockFetchFn.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
        })
      );
      const paths = ['/path1', '/path2'];
      await core.invalidatePaths(paths);
      expect(mockFetchFn).toHaveBeenCalledWith(
        'https://compute.googleapis.com/compute/v1/projects/undefined/global/urlMaps/some-url-map/invalidateCache',
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer test-access-token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host: 'www.dendritestories.co.nz',
            path: '/path1',
            requestId: 'some-uuid',
          }),
        }
      );
    });

    it('should log an error if invalidate cache fails', async () => {
      mockFetchFn.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({ [ACCESS_TOKEN_KEY]: 'test-access-token' }),
        })
      );
      mockFetchFn.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 500,
        })
      );
      const paths = ['/path1'];
      await core.invalidatePaths(paths);
      expect(mockConsoleError).toHaveBeenCalledWith(
        'invalidate /path1 failed: 500'
      );
    });

    it('should log an error if fetch throws an exception', async () => {
      mockFetchFn.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({ [ACCESS_TOKEN_KEY]: 'test-access-token' }),
        })
      );
      mockFetchFn.mockImplementationOnce(() =>
        Promise.reject(new Error('Network error'))
      );
      const paths = ['/path1'];
      await core.invalidatePaths(paths);
      expect(mockConsoleError).toHaveBeenCalledWith(
        'invalidate /path1 error',
        'Network error'
      );
    });

    it('should log the raw error if the thrown value has no message', async () => {
      const rawError = { reason: 'timeout' };
      mockFetchFn.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ [ACCESS_TOKEN_KEY]: 'token' }),
        })
      );
      mockFetchFn.mockImplementationOnce(() => Promise.reject(rawError));

      await core.invalidatePaths(['/path1']);
      expect(mockConsoleError).toHaveBeenCalledWith(
        'invalidate /path1 error',
        rawError
      );
    });

    it('should log primitive rejection values directly', async () => {
      mockFetchFn.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ [ACCESS_TOKEN_KEY]: 'token' }),
        })
      );
      mockFetchFn.mockImplementationOnce(() => Promise.reject('boom'));

      await core.invalidatePaths(['/path1']);
      expect(mockConsoleError).toHaveBeenCalledWith(
        'invalidate /path1 error',
        'boom'
      );
    });
  });

  it('throws when fetch implementation is not provided', () => {
    const db = { collection: jest.fn(), collectionGroup: jest.fn() };
    const auth = { verifyIdToken: jest.fn() };
    const storage = { bucket: jest.fn() };
    const cryptoModule = { randomUUID: jest.fn() };
    const originalFetch = globalThis.fetch;
    globalThis.fetch = undefined;

    try {
      expect(() =>
        createGenerateStatsCore({
          db,
          auth,
          storage,
          fetchFn: undefined,
          cryptoModule,
        })
      ).toThrow('fetch implementation required');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('falls back to the global fetch when no override is provided', () => {
    const db = { collection: jest.fn(), collectionGroup: jest.fn() };
    const auth = { verifyIdToken: jest.fn() };
    const storage = { bucket: jest.fn() };
    const cryptoModule = { randomUUID: jest.fn() };
    const originalFetch = globalThis.fetch;
    const fallbackFetch = jest.fn();
    globalThis.fetch = fallbackFetch;

    try {
      const core = createGenerateStatsCore({
        db,
        auth,
        storage,
        cryptoModule,
      });
      expect(core.generate).toEqual(expect.any(Function));
    } finally {
      if (originalFetch === undefined) {
        delete globalThis.fetch;
      } else {
        globalThis.fetch = originalFetch;
      }
    }
  });
});

describe('generate stats helpers', () => {
  it('detects duplicate app errors by code or message', () => {
    expect(
      isDuplicateAppError({
        code: 'app/duplicate-app',
        message: 'Already exists',
      })
    ).toBe(true);
    expect(isDuplicateAppError({ message: 'project already exists' })).toBe(
      true
    );
    expect(isDuplicateAppError({ message: 'something else' })).toBe(false);
    expect(isDuplicateAppError(null)).toBe(false);
  });

  it('rejects duplicate errors when the message is not a string', () => {
    expect(
      isDuplicateAppError({
        code: 'app/duplicate-app',
        message: { error: 'Already exists' },
      })
    ).toBe(false);
  });

  it('returns false when duplicate identifiers are absent', () => {
    expect(
      isDuplicateAppError({
        code: 'app/other-error',
        message: 'different failure',
      })
    ).toBe(false);
    expect(
      isDuplicateAppError({
        code: 'app/duplicate-app',
        message: 'duplicate flag missing',
      })
    ).toBe(false);
    expect(isDuplicateAppError({ code: 'app/other-error' })).toBe(false);
  });

  it('swallows duplicate initialization errors', () => {
    const init = jest
      .fn()
      .mockImplementationOnce(() => {
        throw { code: 'app/duplicate-app', message: 'Already exists' };
      })
      .mockImplementationOnce(() => {});

    expect(() => initializeFirebaseApp(init)).not.toThrow();
    expect(init).toHaveBeenCalledTimes(1);

    const throwingInit = jest.fn(() => {
      throw new Error('boom');
    });
    expect(() => initializeFirebaseApp(throwingInit)).toThrow('boom');
  });

  it('derives project and URL map env values with fallbacks', () => {
    expect(
      getProjectFromEnv({
        GOOGLE_CLOUD_PROJECT: 'proj',
        GCLOUD_PROJECT: 'legacy',
      })
    ).toBe('proj');
    expect(getProjectFromEnv({ GCLOUD_PROJECT: 'legacy' })).toBe('legacy');
    expect(getProjectFromEnv(null)).toBeUndefined();

    expect(getUrlMapFromEnv({ URL_MAP: 'custom-map' })).toBe('custom-map');
    expect(getUrlMapFromEnv(null)).toBe('prod-dendrite-url-map');
    expect(getUrlMapFromEnv(undefined)).toBe('prod-dendrite-url-map');

    expect(getCdnHostFromEnv({ CDN_HOST: 'cdn.example.com' })).toBe(
      'cdn.example.com'
    );
    expect(getCdnHostFromEnv({ CDN_HOST: '   ' })).toBe(
      'www.dendritestories.co.nz'
    );
    expect(getCdnHostFromEnv(null)).toBe('www.dendritestories.co.nz');
    expect(getCdnHostFromEnv(undefined)).toBe('www.dendritestories.co.nz');
  });

  it('builds HTML with top stories embedded', () => {
    const html = buildHtml(1, 2, 3, [
      { title: 'Story 1', variantCount: 5 },
      { title: 'Story 2', variantCount: 4 },
    ]);
    expect(html).toContain('Number of stories: 1');
    expect(html).toContain('Story 1');
    expect(html).toContain('Story 2');
  });

  it('renders Stats page even when top stories are absent', () => {
    const html = buildHtml(4, 5, 6);
    expect(html).toContain('renderTopStories([]);');
    expect(html).toContain('Number of pages: 5');
    expect(html).not.toContain('Story 1');
  });
});
