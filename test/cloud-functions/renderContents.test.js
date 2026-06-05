import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import {
  mockSave,
  mockFile,
  mockBucket,
  mockExists,
} from '@google-cloud/storage';

const ACCESS_TOKEN_KEY = 'access_token';

async function loadRender() {
  const originalEnv = {
    DENDRITE_ENVIRONMENT: process.env.DENDRITE_ENVIRONMENT,
    DATABASE_ID: process.env.DATABASE_ID,
  };

  process.env.DENDRITE_ENVIRONMENT = 't-123';
  process.env.DATABASE_ID = 't-123';

  try {
    jest.resetModules();
    const mod = await import('../../src/cloud/render-contents/index.js');
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

describe('render contents', () => {
  beforeEach(() => {
    mockSave.mockClear();
    mockFile.mockClear();
    mockBucket.mockClear();
    mockExists.mockClear();
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ [ACCESS_TOKEN_KEY]: 'token' }),
      })
      .mockResolvedValue({ ok: true });
  });

  test('invalidates cache for generated pages', async () => {
    const render = await loadRender();
    const ids = Array.from({ length: 101 }, (_, i) => `s${i + 1}`);
    await render({
      fetchTopStoryIds: async () => ids,
      fetchStoryInfo: async id => ({
        title: id,
        pageNumber: Number(id.slice(1)),
      }),
    });

    const pathCalls = fetch.mock.calls
      .slice(1)
      .map(([, opts]) => JSON.parse(opts.body).path);
    expect(pathCalls).toEqual(['/index.html', '/contents/2.html']);
  });

  test('logs error when cache invalidation fails', async () => {
    const render = await loadRender();
    const ids = Array.from({ length: 101 }, (_, i) => `s${i + 1}`);
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

    await render({
      fetchTopStoryIds: async () => ids,
      fetchStoryInfo: async () => ({ title: 't', pageNumber: 1 }),
    });

    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
