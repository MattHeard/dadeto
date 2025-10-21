import { jest } from '@jest/globals';
import { createInvalidatePaths } from '../../../../src/core/cloud/render-variant/invalidatePaths.js';

describe('createInvalidatePaths', () => {
  it('sends invalidation requests for each path', async () => {
    const fetchJson = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    const generateId = jest
      .fn()
      .mockReturnValueOnce('req-1')
      .mockReturnValueOnce('req-2');
    const logError = jest.fn();
    const getAccessToken = jest.fn().mockResolvedValue('token-123');

    const invalidatePaths = createInvalidatePaths({ fetchJson, generateId, logError });

    await invalidatePaths({
      projectId: 'project-alpha',
      urlMap: 'url-map-1',
      cdnHost: 'cdn.example.com',
      paths: ['/a', '/b'],
      getAccessToken,
    });

    expect(getAccessToken).toHaveBeenCalledTimes(1);
    expect(fetchJson).toHaveBeenCalledTimes(2);
    expect(fetchJson).toHaveBeenNthCalledWith(
      1,
      'https://compute.googleapis.com/compute/v1/projects/project-alpha/global/urlMaps/url-map-1/invalidateCache',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer token-123',
          'Content-Type': 'application/json',
        },
      })
    );
    const firstBody = JSON.parse(fetchJson.mock.calls[0][1].body);
    expect(firstBody).toEqual({
      host: 'cdn.example.com',
      path: '/a',
      requestId: 'req-1',
    });
    const secondBody = JSON.parse(fetchJson.mock.calls[1][1].body);
    expect(secondBody).toEqual({
      host: 'cdn.example.com',
      path: '/b',
      requestId: 'req-2',
    });
    expect(logError).not.toHaveBeenCalled();
  });

  it('logs failures when the request rejects or is not ok', async () => {
    const fetchJson = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockRejectedValueOnce(new Error('network down'));
    const generateId = jest
      .fn()
      .mockReturnValueOnce('req-1')
      .mockReturnValueOnce('req-2');
    const logError = jest.fn();
    const getAccessToken = jest.fn().mockResolvedValue('token-456');

    const invalidatePaths = createInvalidatePaths({ fetchJson, generateId, logError });

    await invalidatePaths({
      projectId: 'project-beta',
      urlMap: 'url-map-2',
      cdnHost: 'cdn.example.com',
      paths: ['/a', '/b'],
      getAccessToken,
    });

    expect(logError).toHaveBeenCalledWith('invalidate /a failed: 500');
    expect(logError).toHaveBeenCalledWith('invalidate /b error', 'network down');
  });
});
