import { jest } from '@jest/globals';
import {
  createGenerateStatsCore,
  isDuplicateAppError,
  initializeFirebaseApp,
  getProjectFromEnv,
  getUrlMapFromEnv,
  getCdnHostFromEnv,
  buildHtml,
} from '../../../../src/core/cloud/generate-stats/generate-stats-core.js';
import { DEFAULT_BUCKET_NAME } from '../../../../src/core/cloud/cloud-core.js';

describe('createGenerateStatsCore', () => {
  let mockDb;
  let mockAuth;
  let mockStorage;
  let mockFetchFn;
  let mockEnv;
  let mockUrlMap;
  let mockCryptoModule;
  let core;
  let mockVerifyAdmin;

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

    // Mock the createVerifyAdmin function
    mockVerifyAdmin = {
      verifyToken: token => Promise.resolve({ uid: 'some-admin-uid' }),
      isAdminUid: decoded => decoded.uid === 'some-admin-uid',
      sendUnauthorized: (response, message) => {
        response.status(401).send(message);
      },
      sendForbidden: response => {
        response.status(403).send('Forbidden');
      },
      getAuthHeader: req => {
        const header = req.get('Authorization');
        if (typeof header === 'string') {
          return header;
        }
        return '';
      },
      matchAuthHeader: authHeader => {
        return authHeader.match(/^Bearer (.+)$/);
      },
      missingTokenMessage: 'Missing token',
      getInvalidTokenMessage: error => {
        const candidate = error?.message;
        return ['Invalid token', candidate][
          Number(typeof candidate === 'string')
        ];
      },
      defaultInvalidTokenMessage: error => {
        const candidate = error?.message;
        return ['Invalid token', candidate][
          Number(typeof candidate === 'string')
        ];
      },
    };

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
          const authHeader = deps.getAuthHeader(req);
          const match = deps.matchAuthHeader(authHeader);
          const token = match?.[1] || '';
          if (!token) {
            deps.sendUnauthorized(res, deps.missingTokenMessage);
            return false;
          }

          try {
            const decoded = await deps.verifyToken(token);
            const isAdmin = Boolean(deps.isAdminUid(decoded));
            if (!isAdmin) {
              deps.sendForbidden(res);
              return false;
            }
          } catch (error) {
            const message =
              deps.getInvalidTokenMessage(error) ||
              deps.defaultInvalidTokenMessage(error);
            deps.sendUnauthorized(res, message);
            return false;
          }
          return true;
        };
      },
    });
  });

  describe('handleRequest', () => {
    let mockReq;
    let mockRes;

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
      mockReq.method = 'GET';
      await core.handleRequest(mockReq, mockRes);
      expect(mockRes.statusCode).toBe(405);
      expect(mockRes.message).toBe('POST only');
    });

    it('should succeed if X-Appengine-Cron header is true', async () => {
      mockReq.isCron = 'true';
      // Mock generate to succeed
      const mockGenFn = () => Promise.resolve();
      await core.handleRequest(mockReq, mockRes, { genFn: mockGenFn });
      expect(mockRes.statusCode).toBe(200);
      expect(mockRes.jsonResponse).toEqual({ ok: true });
    });

    it('should return 401 if not cron and not authorized (missing token)', async () => {
      mockReq.isCron = 'false';
      mockReq.authorization = undefined; // No authorization header
      await core.handleRequest(mockReq, mockRes);
      expect(mockRes.statusCode).toBe(401);
      expect(mockRes.message).toBe('Missing token');
    });

    it('should return 401 if not cron and not authorized (invalid token)', async () => {
      mockReq.isCron = 'false';
      mockReq.authorization = 'Bearer invalid-token';
      mockAuth.verifyIdToken = () =>
        Promise.reject(new Error('Firebase ID token has invalid signature.'));
      await core.handleRequest(mockReq, mockRes);
      expect(mockRes.statusCode).toBe(401);
      expect(mockRes.message).toBe('Firebase ID token has invalid signature.');
    });

    it('should return 403 if not cron and user is not admin', async () => {
      mockReq.isCron = 'false';
      mockReq.authorization = 'Bearer valid-token';
      mockAuth.verifyIdToken = () => Promise.resolve({ uid: 'not-admin' });
      await core.handleRequest(mockReq, mockRes, {
        adminUid: 'some-admin-uid',
      });
      expect(mockRes.statusCode).toBe(403);
      expect(mockRes.message).toBe('Forbidden');
    });

    it('should succeed if not cron and authorized admin', async () => {
      mockReq.isCron = 'false';
      mockReq.authorization = 'Bearer valid-token';
      mockAuth.verifyIdToken = () => Promise.resolve({ uid: 'some-admin-uid' });
      // Mock generate to succeed
      const mockGenFn = () => Promise.resolve();
      await core.handleRequest(mockReq, mockRes, {
        adminUid: 'some-admin-uid',
        genFn: mockGenFn,
      });
      expect(mockRes.statusCode).toBe(200);
      expect(mockRes.jsonResponse).toEqual({ ok: true });
    });

    it('should return 500 if genFn throws an error', async () => {
      mockReq.isCron = 'false';
      mockReq.authorization = 'Bearer valid-token';
      mockAuth.verifyIdToken = () => Promise.resolve({ uid: 'some-admin-uid' });
      const mockGenFn = () => Promise.reject(new Error('Generation failed'));
      await core.handleRequest(mockReq, mockRes, {
        adminUid: 'some-admin-uid',
        genFn: mockGenFn,
      });
      expect(mockRes.statusCode).toBe(500);
      expect(mockRes.jsonResponse).toEqual({ error: 'Generation failed' });
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

      const topStories = await core.getTopStories();
      expect(topStories).toEqual([
        { title: 'Story One', variantCount: 5 },
        { title: 'story2', variantCount: 0 },
      ]);
    });
  });

  describe('generate', () => {
    it('should generate and save HTML, then invalidate paths', async () => {
      const mockStoryCountFn = () => Promise.resolve(1);
      const mockPageCountFn = () => Promise.resolve(2);
      const mockUnmoderatedPageCountFn = () => Promise.resolve(0);
      const mockTopStoriesFn = () => Promise.resolve([]);
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
          json: async () => ({ access_token: 'token-123' }),
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
          json: () => Promise.resolve({ access_token: 'test-access-token' }),
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
          json: () => Promise.resolve({ access_token: 'test-access-token' }),
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
          json: () => Promise.resolve({ access_token: 'test-access-token' }),
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
          json: () => Promise.resolve({ access_token: 'test-access-token' }),
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
          json: () => Promise.resolve({ access_token: 'token' }),
        })
      );
      mockFetchFn.mockImplementationOnce(() => Promise.reject(rawError));

      await core.invalidatePaths(['/path1']);
      expect(mockConsoleError).toHaveBeenCalledWith(
        'invalidate /path1 error',
        rawError
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
});
