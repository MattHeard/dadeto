import { describe, expect, jest, test } from '@jest/globals';
import {
  buildHtml,
  createGenerateStatsCore,
  getCdnHostFromEnv,
  getProjectFromEnv,
  getUrlMapFromEnv,
} from '../../src/core/cloud/generate-stats/core.js';
import {
  getPageCount,
  getUnmoderatedPageCount,
  getTopStories,
} from '../../src/cloud/generate-stats/index.js';

const DEFAULT_BUCKET_NAME = 'www.dendritestories.co.nz';

describe('generate stats helpers', () => {
  test('buildHtml outputs counts', () => {
    const html = buildHtml(1, 2, 3);
    expect(html).toContain('<p>Number of stories: 1</p>');
    expect(html).toContain('<p>Number of pages: 2</p>');
    expect(html).toContain('<p>Number of unmoderated pages: 3</p>');
  });

  test('buildHtml includes favicon link', () => {
    const html = buildHtml(0, 0, 0);
    expect(html).toContain('<link rel="icon" href="/favicon.ico" />');
  });

  test('buildHtml embeds top stories', () => {
    const html = buildHtml(0, 0, 0, [
      { title: 'Story A', variantCount: 2 },
      { title: 'Story B', variantCount: 1 },
    ]);
    expect(html).toContain('d3-sankey');
    expect(html).toContain('sankeyLinkHorizontal');
    expect(html).toContain('rotate(90) scale(-1,1)');
    expect(html).toContain('var(--link)');
    expect(html).toContain('Story A');
  });

  test('getProjectFromEnv prefers GOOGLE_CLOUD_PROJECT', () => {
    expect(
      getProjectFromEnv({
        GOOGLE_CLOUD_PROJECT: 'primary',
        GCLOUD_PROJECT: 'secondary',
      })
    ).toBe('primary');
  });

  test('getProjectFromEnv falls back to GCLOUD_PROJECT', () => {
    expect(getProjectFromEnv({ GCLOUD_PROJECT: 'fallback' })).toBe(
      'fallback'
    );
  });

  test('getProjectFromEnv returns undefined when env lacks project values', () => {
    expect(getProjectFromEnv({})).toBeUndefined();
  });

  test('getProjectFromEnv returns undefined when env is omitted', () => {
    expect(getProjectFromEnv()).toBeUndefined();
  });

  test('getUrlMapFromEnv falls back to the production map', () => {
    expect(getUrlMapFromEnv()).toBe('prod-dendrite-url-map');
    expect(getUrlMapFromEnv(null)).toBe('prod-dendrite-url-map');
  });

  test('getUrlMapFromEnv reads overrides from env', () => {
    expect(getUrlMapFromEnv({ URL_MAP: 'custom-map' })).toBe('custom-map');
  });

  test('getCdnHostFromEnv falls back to the production host', () => {
    expect(getCdnHostFromEnv()).toBe('www.dendritestories.co.nz');
    expect(getCdnHostFromEnv(null)).toBe('www.dendritestories.co.nz');
    expect(getCdnHostFromEnv({ CDN_HOST: '   ' })).toBe(
      'www.dendritestories.co.nz'
    );
  });

  test('getCdnHostFromEnv prefers explicit env overrides', () => {
    expect(getCdnHostFromEnv({ CDN_HOST: 'cdn.example.com' })).toBe(
      'cdn.example.com'
    );
  });

  test('getPageCount returns page count', async () => {
    const mockDb = {
      collectionGroup: () => ({
        count: () => ({
          get: () => Promise.resolve({ data: () => ({ count: 5 }) }),
        }),
      }),
    };
    await expect(getPageCount(mockDb)).resolves.toBe(5);
  });

  test('getUnmoderatedPageCount sums zero and null counts', async () => {
    const mockDb = {
      collectionGroup: () => ({
        where: (_field, _op, value) => ({
          count: () => ({
            get: () =>
              Promise.resolve({
                data: () => ({ count: value === 0 ? 2 : 3 }),
              }),
          }),
        }),
      }),
    };
    await expect(getUnmoderatedPageCount(mockDb)).resolves.toBe(5);
  });

  test('getTopStories returns sorted stories', async () => {
    const statsDocs = [
      { id: 's1', data: () => ({ variantCount: 3 }) },
      { id: 's2', data: () => ({ variantCount: 2 }) },
    ];
    const mockDb = {
      collection: name => {
        if (name === 'storyStats') {
          return {
            orderBy: () => ({
              limit: () => ({
                get: () => Promise.resolve({ docs: statsDocs }),
              }),
            }),
          };
        }
        return {
          doc: id => ({
            get: () =>
              Promise.resolve({
                data: () => ({ title: `Title ${id}` }),
              }),
          }),
        };
      },
    };
    await expect(getTopStories(mockDb)).resolves.toEqual([
      { title: 'Title s1', variantCount: 3 },
      { title: 'Title s2', variantCount: 2 },
    ]);
  });

});

describe('createGenerateStatsCore', () => {
  const createResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  const createCore = (overrides = {}) => {
    const file = { save: jest.fn().mockResolvedValue() };
    const bucketRef = { file: jest.fn(() => file) };
    const storage = overrides.storage ?? {
      bucket: jest.fn(() => bucketRef),
    };
    const fetchFn = overrides.fetchFn ?? jest.fn();
    const auth =
      overrides.auth ??
      {
        verifyIdToken: jest.fn().mockResolvedValue({ uid: 'admin' }),
      };
    const db = overrides.db ?? {};
    const env = overrides.env ?? { GOOGLE_CLOUD_PROJECT: 'project' };

    const coreDeps = {
      db,
      auth,
      storage,
      fetchFn,
      env,
      adminUid: 'admin',
      cryptoModule: overrides.cryptoModule ?? {
        randomUUID: jest.fn().mockReturnValue('uuid'),
      },
    };

    if (typeof overrides.urlMap !== 'undefined') {
      coreDeps.urlMap = overrides.urlMap;
    }

    return {
      core: createGenerateStatsCore(coreDeps),
      storage,
      bucketRef,
      file,
      fetchFn,
      auth,
      env,
    };
  };

  test('retrieves metadata access tokens', async () => {
    const metadataResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({ access_token: 'token' }),
    };
    const fetchFn = jest.fn((url) => {
      if (url.startsWith('http://metadata.google.internal')) {
        return Promise.resolve(metadataResponse);
      }
      return Promise.resolve({ ok: true });
    });
    const { core } = createCore({ fetchFn });

    await expect(core.getAccessTokenFromMetadata()).resolves.toBe('token');
    expect(metadataResponse.json).toHaveBeenCalledTimes(1);
  });

  test('throws when metadata token fetch fails', async () => {
    const fetchFn = jest.fn(() =>
      Promise.resolve({ ok: false, status: 503 })
    );
    const { core } = createCore({ fetchFn });

    await expect(core.getAccessTokenFromMetadata()).rejects.toThrow(
      'metadata token: HTTP 503'
    );
  });

  test('invalidates CDN paths and logs failures', async () => {
    const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
    let callIndex = 0;
    const fetchFn = jest.fn((url) => {
      if (url.startsWith('http://metadata')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ access_token: 'token' }),
        });
      }
      callIndex += 1;
      if (callIndex === 1) {
        return Promise.resolve({ ok: false, status: 400 });
      }
      return Promise.reject(new Error('boom'));
    });
    const cryptoModule = { randomUUID: jest.fn().mockReturnValue('uuid') };
    const { core } = createCore({ fetchFn, cryptoModule });

    await core.invalidatePaths(['paths[0]', 'paths[1]']);

    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(errors).toHaveBeenCalled();
    errors.mockRestore();
  });

  test('invalidatePaths logs raw errors without message properties', async () => {
    const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
    const fetchFn = jest.fn(url => {
      if (url.startsWith('http://metadata')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ access_token: 'token' }),
        });
      }
      return Promise.reject('fail');
    });
    const { core } = createCore({ fetchFn });

    await core.invalidatePaths(['/stats.html']);

    expect(errors).toHaveBeenCalledWith('invalidate /stats.html error', 'fail');
    errors.mockRestore();
  });

  test('invalidatePaths derives the url map from env when not provided', async () => {
    const fetchFn = jest.fn(url => {
      if (url.startsWith('http://metadata')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ access_token: 'token' }),
        });
      }
      return Promise.resolve({ ok: true });
    });
    const { core } = createCore({ fetchFn, env: {} });

    await core.invalidatePaths(['/stats.html']);

    const invalidateCall = fetchFn.mock.calls.find(([url]) =>
      url.includes('/urlMaps/')
    );

    expect(invalidateCall).toBeDefined();
    expect(invalidateCall?.[0]).toContain('/prod-dendrite-url-map/');
    expect(invalidateCall?.[1]).toEqual(
      expect.objectContaining({ method: 'POST' })
    );
  });

  test('invalidatePaths applies default configuration when env is not an object', async () => {
    const fetchFn = jest.fn(url => {
      if (url.startsWith('http://metadata')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ access_token: 'token' }),
        });
      }
      return Promise.resolve({ ok: true });
    });
    const { core } = createCore({ fetchFn, env: 'not-object' });

    await core.invalidatePaths(['/stats.html']);

    const invalidateCall = fetchFn.mock.calls.find(([url]) =>
      url.includes('/invalidateCache')
    );

    expect(invalidateCall).toBeDefined();
    const [requestUrl, options] = invalidateCall ?? [];
    expect(requestUrl).toContain('/prod-dendrite-url-map/');
    const body = options?.body ? JSON.parse(options.body) : {};
    expect(body.host).toBe('www.dendritestories.co.nz');
  });

  test('invalidatePaths uses an explicit url map override when provided', async () => {
    const fetchFn = jest.fn(url => {
      if (url.startsWith('http://metadata')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ access_token: 'token' }),
        });
      }
      return Promise.resolve({ ok: true });
    });
    const { core } = createCore({ fetchFn, urlMap: 'custom-map' });

    await core.invalidatePaths(['/stats.html']);

    const invalidateCall = fetchFn.mock.calls.find(([url]) =>
      url.includes('/urlMaps/')
    );

    expect(invalidateCall).toBeDefined();
    expect(invalidateCall?.[0]).toContain('/custom-map/');
  });

  test('invalidatePaths derives the CDN host from env when missing', async () => {
    const fetchFn = jest.fn(url => {
      if (url.startsWith('http://metadata')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ access_token: 'token' }),
        });
      }
      return Promise.resolve({ ok: true });
    });
    const { core } = createCore({
      fetchFn,
      env: { GOOGLE_CLOUD_PROJECT: 'project', CDN_HOST: 'env-host' },
    });

    await core.invalidatePaths(['/stats.html']);

    const invalidateCall = fetchFn.mock.calls.find(([url]) =>
      url.includes('/invalidateCache')
    );

    expect(invalidateCall).toBeDefined();
    const [, options] = invalidateCall ?? [];
    expect(options).toBeDefined();
    const body = options?.body ? JSON.parse(options.body) : {};
    expect(body.host).toBe('env-host');
  });

  test('generates the stats page and invalidates cache', async () => {
    const storyCountFn = jest.fn().mockResolvedValue(1);
    const pageCountFn = jest.fn().mockResolvedValue(2);
    const unmoderatedPageCountFn = jest.fn().mockResolvedValue(3);
    const topStoriesFn = jest.fn().mockResolvedValue([]);
    const invalidatePathsFn = jest.fn().mockResolvedValue();
    const { core, storage, bucketRef, file } = createCore();

    await expect(
      core.generate({
        storyCountFn,
        pageCountFn,
        unmoderatedPageCountFn,
        topStoriesFn,
        invalidatePathsFn,
      })
    ).resolves.toBeNull();

    expect(storyCountFn).toHaveBeenCalledTimes(1);
    expect(pageCountFn).toHaveBeenCalledTimes(1);
    expect(unmoderatedPageCountFn).toHaveBeenCalledTimes(1);
    expect(topStoriesFn).toHaveBeenCalledTimes(1);
    expect(storage.bucket).toHaveBeenCalledWith(DEFAULT_BUCKET_NAME);
    expect(bucketRef.file).toHaveBeenCalledWith('stats.html');
    expect(file.save).toHaveBeenCalledWith(expect.stringContaining('<!doctype html>'), {
      contentType: 'text/html',
      metadata: { cacheControl: 'no-cache' },
    });
    expect(invalidatePathsFn).toHaveBeenCalledWith(['/stats.html']);
  });

  test('handleRequest rejects non-POST requests', async () => {
    const { core } = createCore();
    const res = createResponse();

    await core.handleRequest({ method: 'GET', get: () => '' }, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.send).toHaveBeenCalledWith('POST only');
  });

  test('handleRequest bypasses auth for cron requests', async () => {
    const genFn = jest.fn().mockResolvedValue();
    const { core } = createCore();
    const res = createResponse();
    const req = {
      method: 'POST',
      get: (key) => (key === 'X-Appengine-Cron' ? 'true' : ''),
    };

    await core.handleRequest(req, res, { genFn });

    expect(genFn).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  test('handleRequest enforces bearer tokens', async () => {
    const { core } = createCore();
    const res = createResponse();
    const req = {
      method: 'POST',
      get: (key) => (key === 'Authorization' ? '' : ''),
    };

    await core.handleRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith('Missing token');
  });

  test('handleRequest rejects invalid bearer headers', async () => {
    const { core } = createCore();
    const res = createResponse();
    const req = {
      method: 'POST',
      get: (key) => (key === 'Authorization' ? 'token' : ''),
    };

    await core.handleRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith('Missing token');
  });

  test('handleRequest rejects invalid tokens from verifyIdToken', async () => {
    const auth = {
      verifyIdToken: jest.fn().mockRejectedValue(new Error('bad token')),
    };
    const { core } = createCore({ auth });
    const res = createResponse();
    const req = {
      method: 'POST',
      get: (key) =>
        key === 'Authorization' ? 'Bearer abc' : '',
    };

    await core.handleRequest(req, res);

    expect(auth.verifyIdToken).toHaveBeenCalledWith('abc');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith('bad token');
  });

  test('handleRequest rejects non-admin users', async () => {
    const auth = {
      verifyIdToken: jest.fn().mockResolvedValue({ uid: 'user' }),
    };
    const { core } = createCore({ auth });
    const res = createResponse();
    const req = {
      method: 'POST',
      get: (key) =>
        key === 'Authorization' ? 'Bearer abc' : '',
    };

    await core.handleRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith('Forbidden');
  });

  test('handleRequest reports generation errors', async () => {
    const genFn = jest.fn().mockRejectedValue(new Error('fail'));
    const { core } = createCore();
    const res = createResponse();
    const req = {
      method: 'POST',
      get: (key) =>
        key === 'Authorization' ? 'Bearer token' : '',
    };

    await core.handleRequest(req, res, { genFn, authInstance: { verifyIdToken: jest.fn().mockResolvedValue({ uid: 'admin' }) } });

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'fail' });
  });

  test('handleRequest runs generation successfully for admins', async () => {
    const genFn = jest.fn().mockResolvedValue();
    const authInstance = {
      verifyIdToken: jest.fn().mockResolvedValue({ uid: 'admin' }),
    };
    const { core } = createCore();
    const res = createResponse();
    const req = {
      method: 'POST',
      get: (key) =>
        key === 'Authorization' ? 'Bearer token' : '',
    };

    await core.handleRequest(req, res, { genFn, authInstance });

    expect(genFn).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  test('handleRequest invokes the default generate implementation when no override is provided', async () => {
    const metadataResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({ access_token: 'token' }),
    };
    const fetchFn = jest.fn(url => {
      if (url.startsWith('http://metadata.google.internal')) {
        return Promise.resolve(metadataResponse);
      }
      return Promise.resolve({ ok: true });
    });
    const storyCollection = {
      count: () => ({
        get: () => Promise.resolve({ data: () => ({ count: 1 }) }),
      }),
      doc: id => ({
        get: () => Promise.resolve({ data: () => ({ title: `Story ${id}` }) }),
      }),
    };
    const db = {
      collection: jest.fn(name => {
        if (name === 'stories') {
          return storyCollection;
        }
        if (name === 'storyStats') {
          return {
            orderBy: () => ({
              limit: () => ({
                get: () =>
                  Promise.resolve({
                    docs: [
                      { id: 'story-1', data: () => ({ variantCount: 2 }) },
                    ],
                  }),
              }),
            }),
          };
        }
        return { doc: () => ({ get: () => Promise.resolve({ data: () => ({}) }) }) };
      }),
      collectionGroup: jest.fn(name => {
        if (name === 'pages') {
          return {
            count: () => ({
              get: () => Promise.resolve({ data: () => ({ count: 4 }) }),
            }),
          };
        }
        if (name === 'variants') {
          return {
            where: jest.fn((_, __, value) => ({
              count: () => ({
                get: () =>
                  Promise.resolve({
                    data: () => ({ count: value === 0 ? 1 : 0 }),
                  }),
              }),
            })),
          };
        }
        return {
          count: () => ({
            get: () => Promise.resolve({ data: () => ({ count: 0 }) }),
          }),
        };
      }),
    };
    const { core } = createCore({ fetchFn, db });
    const res = createResponse();
    const req = {
      method: 'POST',
      get: key => (key === 'Authorization' ? 'Bearer token' : ''),
    };

    await core.handleRequest(req, res, {
      authInstance: { verifyIdToken: jest.fn().mockResolvedValue({ uid: 'admin' }) },
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
    expect(fetchFn).toHaveBeenCalled();
  });

  test('handleRequest falls back to default invalid token message', async () => {
    const authInstance = {
      verifyIdToken: jest.fn().mockRejectedValue({}),
    };
    const { core } = createCore();
    const res = createResponse();
    const req = {
      method: 'POST',
      get: key => (key === 'Authorization' ? 'Bearer nope' : ''),
    };

    await core.handleRequest(req, res, { authInstance });

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith('Invalid token');
  });

  test('handleRequest reports generic errors when message is missing', async () => {
    const genFn = jest.fn().mockRejectedValue('nope');
    const authInstance = {
      verifyIdToken: jest.fn().mockResolvedValue({ uid: 'admin' }),
    };
    const { core } = createCore();
    const res = createResponse();
    const req = {
      method: 'POST',
      get: key => (key === 'Authorization' ? 'Bearer token' : ''),
    };

    await core.handleRequest(req, res, { genFn, authInstance });

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'generate failed' });
  });

  test('throws when no fetch implementation is provided', () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = undefined;

    try {
      expect(() =>
        createGenerateStatsCore({
          db: {},
          auth: {},
          storage: { bucket: jest.fn() },
          fetchFn: undefined,
          env: { GOOGLE_CLOUD_PROJECT: 'project' },
          urlMap: 'map',
          adminUid: 'admin',
          cryptoModule: { randomUUID: jest.fn() },
        })
      ).toThrow(new Error('fetch implementation required'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('getStoryCount falls back to zero when count is missing', async () => {
    const dbRef = {
      collection: () => ({
        count: () => ({
          get: () => Promise.resolve({ data: () => ({}) }),
        }),
      }),
    };
    const { core } = createCore();

    await expect(core.getStoryCount(dbRef)).resolves.toBe(0);
  });

  test('getPageCount falls back to zero when count is missing', async () => {
    const dbRef = {
      collectionGroup: () => ({
        count: () => ({
          get: () => Promise.resolve({ data: () => ({}) }),
        }),
      }),
    };
    const { core } = createCore();

    await expect(core.getPageCount(dbRef)).resolves.toBe(0);
  });

  test('getUnmoderatedPageCount defaults to zero when counts are missing', async () => {
    const dbRef = {
      collectionGroup: () => ({
        where: () => ({
          count: () => ({
            get: () => Promise.resolve({ data: () => ({}) }),
          }),
        }),
      }),
    };
    const { core } = createCore();

    await expect(core.getUnmoderatedPageCount(dbRef)).resolves.toBe(0);
  });

  test('generate uses default helpers when overrides are omitted', async () => {
    const metadataResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({ access_token: 'token' }),
    };
    const fetchFn = jest.fn(url => {
      if (url.startsWith('http://metadata.google.internal')) {
        return Promise.resolve(metadataResponse);
      }
      return Promise.resolve({ ok: true });
    });
    const storyCollection = {
      count: () => ({
        get: () =>
          Promise.resolve({
            data: () => ({ count: 4 }),
          }),
      }),
      doc: id => ({
        get: () =>
          Promise.resolve({
            data: () => ({ title: `Story ${id}` }),
          }),
      }),
    };
    const db = {
      collection: jest.fn(name => {
        if (name === 'stories') {
          return storyCollection;
        }
        if (name === 'storyStats') {
          return {
            orderBy: () => ({
              limit: () => ({
                get: () =>
                  Promise.resolve({
                    docs: [
                      {
                        id: 'story-1',
                        data: () => ({ variantCount: 3 }),
                      },
                    ],
                  }),
              }),
            }),
          };
        }
        return {
          doc: () => ({ get: () => Promise.resolve({ data: () => ({}) }) }),
        };
      }),
      collectionGroup: jest.fn(name => {
        if (name === 'pages') {
          return {
            count: () => ({
              get: () =>
                Promise.resolve({
                  data: () => ({ count: 8 }),
                }),
            }),
          };
        }
        if (name === 'variants') {
          return {
            where: jest.fn((_, __, value) => ({
              count: () => ({
                get: () =>
                  Promise.resolve({
                    data: () => ({ count: value === 0 ? 2 : 1 }),
                  }),
              }),
            })),
          };
        }
        return {
          count: () => ({
            get: () => Promise.resolve({ data: () => ({ count: 0 }) }),
          }),
        };
      }),
    };
    const { core, storage, bucketRef, file } = createCore({ fetchFn, db });

    await expect(core.generate()).resolves.toBeNull();

    expect(storage.bucket).toHaveBeenCalledWith(DEFAULT_BUCKET_NAME);
    expect(bucketRef.file).toHaveBeenCalledWith('stats.html');
    expect(file.save).toHaveBeenCalledWith(
      expect.stringContaining('Story story-1'),
      {
        contentType: 'text/html',
        metadata: { cacheControl: 'no-cache' },
      }
    );
    expect(fetchFn).toHaveBeenCalledWith(
      expect.stringContaining('invalidateCache'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  test('getTopStories falls back to the document id when title is missing', async () => {
    const statsDocs = [{ id: 'story-1', data: () => ({ variantCount: 1 }) }];
    const db = {
      collection: name => {
        if (name === 'storyStats') {
          return {
            orderBy: () => ({
              limit: () => ({
                get: () => Promise.resolve({ docs: statsDocs }),
              }),
            }),
          };
        }
        return {
          doc: () => ({ get: () => Promise.resolve({ data: () => undefined }) }),
        };
      },
    };
    const { core } = createCore({ db });

    await expect(core.getTopStories()).resolves.toEqual([
      { title: 'story-1', variantCount: 1 },
    ]);
  });

  test('getTopStories defaults variant counts when missing', async () => {
    const statsDocs = [{ id: 'story-2', data: () => ({}) }];
    const db = {
      collection: name => {
        if (name === 'storyStats') {
          return {
            orderBy: () => ({
              limit: () => ({
                get: () => Promise.resolve({ docs: statsDocs }),
              }),
            }),
          };
        }
        return {
          doc: id => ({
            get: () => Promise.resolve({ data: () => ({ title: `Story ${id}` }) }),
          }),
        };
      },
    };
    const { core } = createCore({ db });

    await expect(core.getTopStories()).resolves.toEqual([
      { title: 'Story story-2', variantCount: 0 },
    ]);
  });
});
