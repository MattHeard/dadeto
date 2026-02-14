import { jest } from '@jest/globals';
import {
  buildHtml,
  createFetchTopStoryIds,
  createFetchStoryInfo,
  createRenderContents,
  createInvalidatePaths,
  handleInvalidateError,
  getAllowedOrigins,
  createApplyCorsHeaders,
  createValidateRequest,
  buildHandleRenderRequest,
  createAuthorizeRequest,
  resolveAuthorizationHeader,
  getHeaderFromHeaders,
  resolveHeaderValue,
  ensureAdminIdentity,
  DEFAULT_BUCKET_NAME,
  productionOrigins,
} from '../../../../src/core/cloud/render-contents/render-contents-core.js';

const ACCESS_TOKEN_KEY = 'access_token';

describe('buildHtml', () => {
  it('escapes titles and renders list items', () => {
    const html = buildHtml([
      { pageNumber: 5, title: 'Hello <World>' },
      { pageNumber: '6a', title: 'Another & Story' },
    ]);

    expect(html).toContain('<ol class="contents">');
    expect(html).toContain('&lt;World&gt;');
    expect(html).toContain('&amp;');
    expect(html).toContain('./p/5a.html');
  });

  it('coerces falsy titles to empty strings', () => {
    const html = buildHtml([{ pageNumber: 1, title: null }]);

    expect(html).toContain('<ol class="contents">');
    expect(html).not.toContain('null');
    expect(html).not.toContain('undefined');
  });
});

describe('createFetchTopStoryIds', () => {
  it('throws when db is falsy', () => {
    expect(() => createFetchTopStoryIds(null)).toThrow(
      new TypeError('db must provide a collection helper')
    );
  });

  it('throws when db.collection is not a function', () => {
    expect(() =>
      createFetchTopStoryIds({ collection: 'not-a-function' })
    ).toThrow(new TypeError('db must provide a collection helper'));
  });

  it('orders and limits story stats', async () => {
    const snapshot = {
      docs: [{ id: 'one' }, { id: 'two' }],
    };
    const db = {
      collection: jest.fn(() => ({
        orderBy: jest.fn(() => ({
          limit: jest.fn(() => ({
            get: jest.fn().mockResolvedValue(snapshot),
          })),
        })),
      })),
    };

    const fetchTopStoryIds = createFetchTopStoryIds(db);
    await expect(fetchTopStoryIds()).resolves.toEqual(['one', 'two']);
    expect(db.collection).toHaveBeenCalledWith('storyStats');
  });
});

describe('createFetchStoryInfo', () => {
  it('returns null when story or root page is missing', async () => {
    const docRef = {
      get: jest.fn().mockResolvedValue({ exists: false }),
    };
    const db = {
      collection: jest.fn(() => ({ doc: () => docRef })),
    };

    const fetchStoryInfo = createFetchStoryInfo(db);
    await expect(fetchStoryInfo('missing')).resolves.toBeNull();

    docRef.get.mockResolvedValueOnce({ exists: true, data: () => ({}) });
    await expect(fetchStoryInfo('no-root-ref')).resolves.toBeNull();

    const rootRef = { get: jest.fn().mockResolvedValue({ exists: false }) };
    docRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ rootPage: rootRef }),
    });
    await expect(fetchStoryInfo('missing-root-page')).resolves.toBeNull();
  });

  it('returns story title and root page number', async () => {
    const rootPageSnap = {
      exists: true,
      data: () => ({ number: 7 }),
    };
    const rootPageRef = {
      get: jest.fn().mockResolvedValue(rootPageSnap),
    };
    const storySnap = {
      exists: true,
      data: () => ({ title: 'Story', rootPage: rootPageRef }),
    };
    const db = {
      collection: jest.fn(() => ({
        doc: () => ({ get: jest.fn().mockResolvedValue(storySnap) }),
      })),
    };

    const fetchStoryInfo = createFetchStoryInfo(db);
    await expect(fetchStoryInfo('id')).resolves.toEqual({
      title: 'Story',
      pageNumber: 7,
    });
  });

  it('defaults missing story titles to empty string', async () => {
    const rootPageSnap = {
      exists: true,
      data: () => ({ number: 2 }),
    };
    const rootPageRef = {
      get: jest.fn().mockResolvedValue(rootPageSnap),
    };
    const storySnap = {
      exists: true,
      data: () => ({ title: null, rootPage: rootPageRef }),
    };
    const db = {
      collection: jest.fn(() => ({
        doc: () => ({ get: jest.fn().mockResolvedValue(storySnap) }),
      })),
    };

    const fetchStoryInfo = createFetchStoryInfo(db);
    await expect(fetchStoryInfo('null-title')).resolves.toEqual({
      title: '',
      pageNumber: 2,
    });
  });

  it('returns undefined page numbers when the root page has no numeric value', async () => {
    const rootPageSnap = {
      exists: true,
      data: () => ({}),
    };
    const rootPageRef = {
      get: jest.fn().mockResolvedValue(rootPageSnap),
    };
    const storySnap = {
      exists: true,
      data: () => ({ rootPage: rootPageRef }),
    };
    const db = {
      collection: jest.fn(() => ({
        doc: () => ({ get: jest.fn().mockResolvedValue(storySnap) }),
      })),
    };

    const fetchStoryInfo = createFetchStoryInfo(db);
    await expect(fetchStoryInfo('missing-number')).resolves.toEqual({
      title: '',
      pageNumber: null,
    });
  });
});

describe('createRenderContents', () => {
  it('validates required dependencies', async () => {
    const storage = { bucket: jest.fn() };
    const fetchFn = jest.fn();
    const randomUUID = jest.fn();

    const renderContents = createRenderContents({
      storage,
      fetchFn,
      randomUUID,
    });

    await expect(renderContents()).rejects.toThrow(
      new TypeError('db must provide a collection helper')
    );

    expect(() =>
      createRenderContents({
        db: { collection: jest.fn() },
        storage: null,
        fetchFn,
        randomUUID,
      })
    ).toThrow(new TypeError('storage must provide a bucket helper'));

    expect(() =>
      createRenderContents({
        db: { collection: jest.fn() },
        storage: { bucket: 'not-a-function' },
        fetchFn,
        randomUUID,
      })
    ).toThrow(new TypeError('storage must provide a bucket helper'));

    expect(() =>
      createRenderContents({
        db: { collection: jest.fn() },
        storage,
        fetchFn: null,
        randomUUID,
      })
    ).toThrow(new TypeError('fetchFn must be a function'));

    expect(() =>
      createRenderContents({
        db: { collection: jest.fn() },
        storage,
        fetchFn,
        randomUUID: null,
      })
    ).toThrow(new TypeError('randomUUID must be a function'));
  });

  it('throws when called without options', () => {
    expect(() => createRenderContents()).toThrow(
      new TypeError('storage must provide a bucket helper')
    );
  });

  it('renders pages with provided fetchers and invalidates caches', async () => {
    const bucketFile = jest.fn(() => ({
      save: jest.fn().mockResolvedValue(undefined),
    }));
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
        json: async () => ({ [ACCESS_TOKEN_KEY]: 'token' }),
      })
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });

    const randomUUID = jest.fn().mockReturnValue('uuid');

    const renderContents = createRenderContents({
      storage,
      fetchFn,
      randomUUID,
      pageSize: 2,
    });

    const items = [
      { title: 'One', pageNumber: 1 },
      { title: 'Two', pageNumber: 2 },
      { title: 'Three', pageNumber: 3 },
    ];

    const render = renderContents({
      fetchTopStoryIds: async () => ['a', 'b', 'c'],
      fetchStoryInfo: async id => items[{ a: 0, b: 1, c: 2 }[id]],
    });

    await expect(render).resolves.toBeNull();
    expect(bucketFile).toHaveBeenCalledWith('index.html');
    expect(bucketFile).toHaveBeenCalledWith('contents/2.html');
    expect(fetchFn).toHaveBeenCalled();
  });

  it('uses cached factories when overrides are not supplied', async () => {
    const storyStatsSnapshot = {
      docs: [{ id: 'id' }],
    };
    const pageSnap = {
      exists: true,
      data: () => ({ number: 3 }),
    };
    const rootRef = { get: jest.fn().mockResolvedValue(pageSnap) };
    const db = {
      collection: jest.fn(name => {
        if (name === 'storyStats') {
          return {
            orderBy: jest.fn(() => ({
              limit: jest.fn(() => ({
                get: jest.fn().mockResolvedValue(storyStatsSnapshot),
              })),
            })),
          };
        }
        if (name === 'stories') {
          return {
            doc: () => ({
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({ title: 'Story', rootPage: rootRef }),
              }),
            }),
          };
        }
        throw new Error(`unexpected collection ${name}`);
      }),
    };

    const bucket = { file: jest.fn(() => ({ save: jest.fn() })) };
    const storage = { bucket: jest.fn(() => bucket) };
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ [ACCESS_TOKEN_KEY]: 't' }),
      })
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    const randomUUID = jest.fn().mockReturnValue('uuid');

    const renderContents = createRenderContents({
      db,
      storage,
      fetchFn,
      randomUUID,
    });

    await renderContents();
    await renderContents();

    expect(rootRef.get).toHaveBeenCalledTimes(2);
  });

  it('logs invalidation failures without throwing', async () => {
    const bucket = { file: jest.fn(() => ({ save: jest.fn() })) };
    const storage = { bucket: jest.fn(() => bucket) };
    const consoleError = jest.fn();
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ [ACCESS_TOKEN_KEY]: 't' }),
      })
      .mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    const randomUUID = jest.fn().mockReturnValue('uuid');

    const renderContents = createRenderContents({
      storage,
      fetchFn,
      randomUUID,
      consoleError,
    });

    await renderContents({
      fetchTopStoryIds: async () => [],
      fetchStoryInfo: async () => null,
    });

    expect(consoleError).toHaveBeenCalled();
  });

  it('propagates access token failures thrown by invalidatePaths', async () => {
    const bucket = { file: jest.fn(() => ({ save: jest.fn() })) };
    const storage = { bucket: jest.fn(() => bucket) };
    const randomUUID = jest.fn().mockReturnValue('uuid');
    const fetchFn = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'denied' }),
    });

    const renderContents = createRenderContents({
      storage,
      fetchFn,
      randomUUID,
    });

    await expect(
      renderContents({
        fetchTopStoryIds: async () => [],
        fetchStoryInfo: async () => null,
      })
    ).rejects.toThrow('metadata token: HTTP 401');
  });

  it('logs thrown invalidation errors without truthy messages', async () => {
    const bucket = { file: jest.fn(() => ({ save: jest.fn() })) };
    const storage = { bucket: jest.fn(() => bucket) };
    const consoleError = jest.fn();
    const thrownError = { code: 'ERR' };
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ [ACCESS_TOKEN_KEY]: 't' }),
      })
      .mockRejectedValueOnce(thrownError);
    const randomUUID = jest.fn().mockReturnValue('uuid');

    const renderContents = createRenderContents({
      storage,
      fetchFn,
      randomUUID,
      consoleError,
    });

    await renderContents({
      fetchTopStoryIds: async () => ['story'],
      fetchStoryInfo: async () => ({ title: 'Story', pageNumber: 1 }),
    });

    expect(consoleError).toHaveBeenCalledWith(
      'invalidate /index.html error',
      thrownError
    );
  });

  it('supports missing consoleError handlers when invalidation throws', async () => {
    const bucket = { file: jest.fn(() => ({ save: jest.fn() })) };
    const storage = { bucket: jest.fn(() => bucket) };
    const consoleError = jest.fn();
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ [ACCESS_TOKEN_KEY]: 'token' }),
      })
      .mockRejectedValueOnce(new Error('boom'));
    const randomUUID = jest.fn().mockReturnValue('uuid');

    const renderContents = createRenderContents({
      storage,
      fetchFn,
      randomUUID,
      consoleError,
    });

    await expect(
      renderContents({
        fetchTopStoryIds: async () => ['a'],
        fetchStoryInfo: async () => ({ title: 'One', pageNumber: 1 }),
      })
    ).resolves.toBeNull();

    expect(consoleError).toHaveBeenCalledWith(
      'invalidate /index.html error',
      'boom'
    );
  });

  it('logs failed invalidation responses when provided', async () => {
    const bucket = { file: jest.fn(() => ({ save: jest.fn() })) };
    const storage = { bucket: jest.fn(() => bucket) };
    const consoleError = jest.fn();
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ [ACCESS_TOKEN_KEY]: 'token' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({}),
      });
    const randomUUID = jest.fn().mockReturnValue('uuid');

    const renderContents = createRenderContents({
      storage,
      fetchFn,
      randomUUID,
      consoleError,
    });

    await renderContents({
      fetchTopStoryIds: async () => ['story'],
      fetchStoryInfo: async () => ({ title: 'Story', pageNumber: 1 }),
    });

    expect(consoleError).toHaveBeenCalledWith(
      'invalidate /index.html failed: 503'
    );
  });

  it('handles fetchStoryInfo returning null for identifiers', async () => {
    const bucket = {
      file: jest.fn(() => ({ save: jest.fn().mockResolvedValue(undefined) })),
    };
    const storage = { bucket: jest.fn(() => bucket) };
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ [ACCESS_TOKEN_KEY]: 'token' }),
      })
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    const randomUUID = jest.fn().mockReturnValue('uuid');

    const renderContents = createRenderContents({
      storage,
      fetchFn,
      randomUUID,
    });

    await expect(
      renderContents({
        fetchTopStoryIds: async () => ['missing'],
        fetchStoryInfo: async () => null,
      })
    ).resolves.toBeNull();
  });
});

describe('createAuthorizeRequest', () => {
  const mockRes = () => ({
    status: jest.fn(() => ({ send: jest.fn() })),
  });

  it('authorizes using the Authorization header', async () => {
    const verifyIdToken = jest.fn().mockResolvedValue({ uid: 'admin' });
    const authorizeRequest = createAuthorizeRequest({
      verifyIdToken,
      adminUid: 'admin',
    });
    const req = {
      get: jest.fn(() => undefined),
      headers: { Authorization: 'Bearer abc123' },
    };
    const res = mockRes();

    await expect(authorizeRequest({ req, res })).resolves.toEqual({
      uid: 'admin',
    });
    expect(verifyIdToken).toHaveBeenCalledWith('abc123');
  });

  it('authorizes using the lowercase authorization header', async () => {
    const verifyIdToken = jest.fn().mockResolvedValue({ uid: 'admin' });
    const authorizeRequest = createAuthorizeRequest({
      verifyIdToken,
      adminUid: 'admin',
    });
    const req = {
      get: jest.fn(() => undefined),
      headers: { authorization: 'Bearer xyz789' },
    };
    const res = mockRes();

    await expect(authorizeRequest({ req, res })).resolves.toEqual({
      uid: 'admin',
    });
    expect(verifyIdToken).toHaveBeenCalledWith('xyz789');
  });

  it('treats header objects without credentials as missing tokens', async () => {
    const verifyIdToken = jest.fn();
    const authorizeRequest = createAuthorizeRequest({
      verifyIdToken,
      adminUid: 'admin',
    });
    const req = {
      get: jest.fn(() => undefined),
      headers: { foo: 'bar' },
    };
    const res = mockRes();

    await expect(authorizeRequest({ req, res })).resolves.toBeNull();
    expect(res.status).toHaveBeenCalledWith(401);
    const statusResponse = res.status.mock.results[0].value;
    expect(statusResponse.send).toHaveBeenCalledWith('Missing token');
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it('rejects tokens that resolve to null payloads', async () => {
    const verifyIdToken = jest.fn().mockResolvedValue(null);
    const authorizeRequest = createAuthorizeRequest({
      verifyIdToken,
      adminUid: 'admin',
    });

    const req = {
      get: jest.fn(() => undefined),
      headers: { Authorization: 'Bearer deadbeef' },
    };
    const res = mockRes();

    await expect(authorizeRequest({ req, res })).resolves.toBeNull();
    expect(res.status).toHaveBeenCalledWith(403);
    const statusResponse = res.status.mock.results[0].value;
    expect(statusResponse.send).toHaveBeenCalledWith('Forbidden');
  });
});

describe('resolveAuthorizationHeader', () => {
  it('prefers the getter Authorization header when available', () => {
    const req = {
      get: jest.fn(name =>
        name === 'Authorization' ? 'Bearer getter' : undefined
      ),
      headers: { authorization: 'Bearer fallback' },
    };

    const header = resolveAuthorizationHeader(req);

    expect(header).toBe('Bearer getter');
    expect(req.get).toHaveBeenCalledWith('Authorization');
  });

  it('supports missing headers by returning an empty string', () => {
    const req = {
      get: jest.fn(() => undefined),
    };

    expect(resolveAuthorizationHeader(req)).toBe('');
  });
});

describe('ensureAdminIdentity', () => {
  it('rejects when the decoded payload is missing', () => {
    const res = { status: jest.fn(() => ({ send: jest.fn() })) };
    expect(ensureAdminIdentity(null, 'foo', res)).toBeNull();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.status.mock.results[0].value.send).toHaveBeenCalledWith(
      'Forbidden'
    );
  });
});

describe('getHeaderFromHeaders', () => {
  it('returns undefined when headers are missing', () => {
    expect(getHeaderFromHeaders({})).toBeUndefined();
    expect(getHeaderFromHeaders({ headers: null })).toBeUndefined();
    expect(getHeaderFromHeaders(null)).toBeUndefined();
  });

  it('prefers the Authorization header value', () => {
    const req = { headers: { Authorization: 'Bearer upper' } };
    expect(getHeaderFromHeaders(req)).toBe('Bearer upper');
  });

  it('falls back to lowercase authorization keys', () => {
    const req = { headers: { authorization: 'Bearer lower' } };
    expect(getHeaderFromHeaders(req)).toBe('Bearer lower');
  });
});

describe('resolveHeaderValue', () => {
  it('returns undefined when headers are absent', () => {
    expect(resolveHeaderValue(undefined)).toBeUndefined();
  });

  it('returns the first header value when present', () => {
    const headers = {
      Authorization: 'Bearer upper',
      authorization: 'Bearer lower',
    };
    expect(resolveHeaderValue(headers)).toBe('Bearer upper');
  });
});

describe('createInvalidatePaths', () => {
  it('returns early when paths are missing or empty', async () => {
    const fetchFn = jest.fn();
    const randomUUID = jest.fn(() => 'uuid');
    const invalidatePaths = createInvalidatePaths({ fetchFn, randomUUID });

    await invalidatePaths(undefined);
    await invalidatePaths([]);

    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('logs invalidate failures when a logger is provided', async () => {
    const consoleError = jest.fn();
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ [ACCESS_TOKEN_KEY]: 'token' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

    const invalidatePaths = createInvalidatePaths({
      fetchFn,
      randomUUID: jest.fn(() => 'uuid'),
      projectId: 'proj',
      urlMapName: 'map',
      cdnHost: 'cdn.example.com',
      consoleError,
    });

    await expect(invalidatePaths(['/p/1a.html'])).resolves.toBeUndefined();

    expect(consoleError).toHaveBeenCalledWith(
      'invalidate /p/1a.html failed: 500'
    );
  });

  it('logs raw error values when messages are unavailable', async () => {
    const consoleError = jest.fn();
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ [ACCESS_TOKEN_KEY]: 'token' }),
      })
      .mockRejectedValueOnce('boom');

    const invalidatePaths = createInvalidatePaths({
      fetchFn,
      randomUUID: jest.fn(() => 'uuid'),
      projectId: 'proj',
      urlMapName: 'map',
      cdnHost: 'cdn.example.com',
      consoleError,
    });

    await invalidatePaths(['/p/error.html']);

    expect(consoleError).toHaveBeenCalledWith(
      'invalidate /p/error.html error',
      'boom'
    );
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('reports errors when handleInvalidateError is passed a logger', () => {
    const consoleError = jest.fn();
    handleInvalidateError(new Error('boom'), '/p/test.html', consoleError);

    expect(consoleError).toHaveBeenCalledWith(
      'invalidate /p/test.html error',
      'boom'
    );
  });
});

describe('getAllowedOrigins', () => {
  it('returns configured origins when present', () => {
    const origins = getAllowedOrigins({
      RENDER_CONTENTS_ALLOWED_ORIGINS: ' https://a.test ,https://b.test ',
    });

    expect(origins).toEqual(['https://a.test', 'https://b.test']);
  });

  it('falls back to production origins', () => {
    expect(getAllowedOrigins({})).toEqual(productionOrigins);
  });
});

describe('createApplyCorsHeaders', () => {
  it('allows requests without an origin', () => {
    const res = { set: jest.fn() };
    const apply = createApplyCorsHeaders({
      allowedOrigins: ['https://allowed'],
    });

    expect(apply({}, res)).toBe(true);
    expect(res.set).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
  });

  it('allows configured origins and varies header', () => {
    const res = { set: jest.fn() };
    const req = { get: jest.fn().mockReturnValue('https://allowed') };
    const apply = createApplyCorsHeaders({
      allowedOrigins: ['https://allowed'],
    });

    expect(apply(req, res)).toBe(true);
    expect(res.set).toHaveBeenCalledWith(
      'Access-Control-Allow-Origin',
      'https://allowed'
    );
    expect(res.set).toHaveBeenCalledWith('Vary', 'Origin');
  });

  it('rejects unknown origins', () => {
    const res = { set: jest.fn() };
    const req = { get: jest.fn().mockReturnValue('https://denied') };
    const apply = createApplyCorsHeaders({
      allowedOrigins: ['https://allowed'],
    });

    expect(apply(req, res)).toBe(false);
    expect(res.set).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'null');
  });

  it('respects only array inputs for allowed origins', () => {
    const res = { set: jest.fn() };
    const req = { get: jest.fn().mockReturnValue('https://allowed') };
    const apply = createApplyCorsHeaders({
      allowedOrigins: 'https://allowed',
    });

    expect(apply(req, res)).toBe(false);
    expect(res.set).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'null');
    expect(res.set).toHaveBeenCalledWith('Vary', 'Origin');
  });
});

describe('createValidateRequest', () => {
  it('handles OPTIONS, CORS and method checks', () => {
    const applyCorsHeaders = jest.fn(() => false);
    const validate = createValidateRequest({ applyCorsHeaders });
    const res = {
      status: jest.fn().mockReturnValue({ send: jest.fn() }),
      send: jest.fn(),
    };

    expect(validate({ method: 'OPTIONS' }, res)).toBe(false);
    expect(res.status).toHaveBeenCalledWith(403);

    applyCorsHeaders.mockReturnValueOnce(false);
    res.status.mockClear();
    expect(validate({ method: 'POST' }, res)).toBe(false);
    expect(res.status).toHaveBeenCalledWith(403);

    applyCorsHeaders.mockReturnValueOnce(true);
    res.status.mockClear();
    expect(validate({ method: 'GET' }, res)).toBe(false);
    expect(res.status).toHaveBeenCalledWith(405);

    applyCorsHeaders.mockReturnValueOnce(true);
    res.status.mockClear();
    expect(validate({ method: 'POST' }, res)).toBe(true);
  });

  it('responds 204 for OPTIONS when the origin is allowed', () => {
    const applyCorsHeaders = jest.fn(() => true);
    const validate = createValidateRequest({ applyCorsHeaders });
    const send = jest.fn();
    const res = {
      status: jest.fn().mockReturnValue({ send }),
      send: jest.fn(),
    };

    expect(validate({ method: 'OPTIONS' }, res)).toBe(false);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(send).toHaveBeenCalledWith('');
  });
});

describe('buildHandleRenderRequest', () => {
  const validateRequest = jest.fn(() => true);
  const render = jest.fn().mockResolvedValue(undefined);
  const verifyIdToken = jest.fn().mockResolvedValue({ uid: 'admin' });

  const build = () =>
    buildHandleRenderRequest({
      validateRequest,
      verifyIdToken,
      adminUid: 'admin',
      render,
    });

  const makeResponse = () => ({
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
    json: jest.fn(),
  });

  const makeRequest = authHeader => ({
    get: jest.fn().mockReturnValue(authHeader),
    headers: authHeader ? { Authorization: authHeader } : undefined,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    render.mockResolvedValue(undefined);
    verifyIdToken.mockResolvedValue({ uid: 'admin' });
  });

  it('extracts tokens via req.get before verifying', async () => {
    const handler = build();
    const req = { get: jest.fn().mockReturnValue('Bearer token') };
    const res = makeResponse();

    await handler(req, res);

    expect(verifyIdToken).toHaveBeenCalledWith('token');
  });

  it('rejects when validateRequest blocks the call', async () => {
    validateRequest.mockReturnValueOnce(false);
    const handler = build();
    const res = makeResponse();

    await handler(makeRequest('Bearer token'), res);

    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it('handles missing tokens and invalid admin', async () => {
    const handler = build();
    const res = makeResponse();

    await handler(makeRequest(undefined), res);
    expect(res.status).toHaveBeenCalledWith(401);

    const req = makeRequest('Bearer token');
    verifyIdToken.mockResolvedValueOnce({ uid: 'not-admin' });
    res.status.mockClear();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('falls back to headers and handles non-string authorization values', async () => {
    const handler = build();
    const res = makeResponse();
    const req = {
      get: jest.fn(() => undefined),
      headers: { authorization: 123 },
    };

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith('Missing token');
  });

  it('extracts bearer tokens from headers when getter is absent', async () => {
    const handler = build();
    const req = {
      get: jest.fn(() => undefined),
      headers: { authorization: 'Bearer header-token' },
    };
    const res = makeResponse();

    await handler(req, res);

    expect(verifyIdToken).toHaveBeenCalledWith('header-token');
  });

  it('returns 401 when verification throws', async () => {
    const handler = build();
    const req = makeRequest('Bearer token');
    verifyIdToken.mockRejectedValueOnce(new Error('bad token'));
    const res = makeResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('rejects non-string getter responses', async () => {
    const handler = build();
    const req = {
      get: jest.fn().mockImplementation(header => {
        if (header === 'Authorization') {
          return [123];
        }
        return undefined;
      }),
    };
    const res = makeResponse();

    await handler(req, res);

    expect(verifyIdToken).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith('Missing token');
  });

  it('throws when adminUid is missing', () => {
    expect(() =>
      buildHandleRenderRequest({
        validateRequest: jest.fn(),
        verifyIdToken: jest.fn(),
        render: jest.fn(),
      })
    ).toThrow(new TypeError('adminUid must be provided'));
  });

  it('reports invalid tokens without messages', async () => {
    const handler = build();
    const req = makeRequest('Bearer token');
    verifyIdToken.mockRejectedValueOnce({});
    const res = makeResponse();

    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith('Invalid token');
  });

  it('returns generic render errors when messages are missing', async () => {
    const handler = build();
    const req = makeRequest('Bearer token');
    verifyIdToken.mockResolvedValueOnce({ uid: 'admin' });
    render.mockRejectedValueOnce({});
    const res = makeResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'render failed' });
  });

  it('runs render and returns JSON payload', async () => {
    const handler = build();
    const req = makeRequest('Bearer token');
    verifyIdToken.mockResolvedValueOnce({ uid: 'admin' });
    render.mockResolvedValueOnce(undefined);
    const res = makeResponse();

    await handler(req, res);

    expect(render).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it('propagates render errors from the configured renderer', async () => {
    const handler = build();
    const req = makeRequest('Bearer token');
    verifyIdToken.mockResolvedValueOnce({ uid: 'admin' });
    render.mockRejectedValueOnce(new Error('boom'));
    const res = makeResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'boom' });
  });
});
