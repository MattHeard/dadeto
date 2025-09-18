import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import {
  mockSave,
  mockFile,
  mockBucket,
  mockExists,
} from '@google-cloud/storage';
import { render } from '../../src/cloud/render-contents/index.js';

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
        json: async () => ({ access_token: 'token' }),
      })
      .mockResolvedValue({ ok: true });
  });

  test('invalidates cache for generated pages', async () => {
    const ids = Array.from({ length: 31 }, (_, i) => `s${i + 1}`);
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
    const ids = Array.from({ length: 31 }, (_, i) => `s${i + 1}`);
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token' }),
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
