import { jest } from '@jest/globals';
import { createGenerateStatsCore } from '../../../../src/core/cloud/generate-stats/generate-stats-core.js';

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

    it('getTopStories should return the correct data', async () => {
      mockDb.get = () => {
        if (mockDb.get.mockName === 'storyStats') {
          return Promise.resolve({
            docs: [
              { id: 'story1', data: () => ({ variantCount: 5 }) },
              { id: 'story2', data: () => ({ variantCount: 3 }) },
            ],
          });
        } else if (mockDb.get.mockName === 'stories') {
          if (mockDb.get.storyId === 'story1') {
            return Promise.resolve({ data: () => ({ title: 'Story One' }) });
          } else if (mockDb.get.storyId === 'story2') {
            return Promise.resolve({ data: () => ({ title: 'Story Two' }) });
          }
        }
        return Promise.resolve({ data: () => ({}) });
      };

      mockDb.collection = name => {
        if (name === 'storyStats') {
          mockDb.get.mockName = 'storyStats';
        } else if (name === 'stories') {
          mockDb.get.mockName = 'stories';
        }
        return mockDb;
      };
      mockDb.doc = id => {
        mockDb.get.storyId = id;
        return mockDb;
      };

      const topStories = await core.getTopStories();
      expect(topStories).toEqual([
        { title: 'Story One', variantCount: 5 },
        { title: 'Story Two', variantCount: 3 },
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

      await core.generate({
        storyCountFn: mockStoryCountFn,
        pageCountFn: mockPageCountFn,
        unmoderatedPageCountFn: mockUnmoderatedPageCountFn,
        topStoriesFn: mockTopStoriesFn,
        storageInstance: mockStorageInstance,
        bucketName: 'test-bucket',
        invalidatePathsFn: mockInvalidatePathsFn,
      });

      expect(mockStorageInstance.saveCalled).toBe(true);
      expect(mockInvalidatePathsFn.called).toBe(true);
      expect(mockInvalidatePathsFn.paths).toEqual(['/stats.html']);
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
  });
});
