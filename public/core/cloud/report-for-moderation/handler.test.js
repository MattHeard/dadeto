import { jest } from '@jest/globals';
import { createReportForModerationHandler } from './handler.js';

describe('createReportForModerationHandler', () => {
  it('creates a moderation report when the request is valid', async () => {
    const addModerationReport = jest.fn().mockResolvedValue(undefined);
    const getServerTimestamp = jest.fn().mockReturnValue('timestamp');
    const handler = createReportForModerationHandler({
      addModerationReport,
      getServerTimestamp,
    });

    const response = await handler({
      method: 'POST',
      body: { variant: ' slug-value ' },
    });

    expect(addModerationReport).toHaveBeenCalledWith({
      variant: 'slug-value',
      createdAt: 'timestamp',
    });
    expect(response).toEqual({ status: 201, body: {} });
  });

  it('returns 405 when using a method other than POST', async () => {
    const addModerationReport = jest.fn();
    const getServerTimestamp = jest.fn();
    const handler = createReportForModerationHandler({
      addModerationReport,
      getServerTimestamp,
    });

    const response = await handler({ method: 'GET' });

    expect(response).toEqual({ status: 405, body: 'POST only' });
    expect(addModerationReport).not.toHaveBeenCalled();
  });

  it('returns 400 when variant is missing or blank', async () => {
    const addModerationReport = jest.fn();
    const getServerTimestamp = jest.fn();
    const handler = createReportForModerationHandler({
      addModerationReport,
      getServerTimestamp,
    });

    await expect(
      handler({
        method: 'POST',
        body: {},
      })
    ).resolves.toEqual({ status: 400, body: 'Missing or invalid variant' });

    await expect(
      handler({
        method: 'POST',
        body: { variant: '   ' },
      })
    ).resolves.toEqual({ status: 400, body: 'Missing or invalid variant' });

    expect(addModerationReport).not.toHaveBeenCalled();
  });
});
