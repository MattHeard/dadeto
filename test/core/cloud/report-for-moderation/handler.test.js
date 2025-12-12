import { jest } from '@jest/globals';
import { createReportForModerationHandler } from '../../../../src/core/cloud/report-for-moderation/report-for-moderation-core.js';

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

  it('throws when addModerationReport is not a function', () => {
    expect(() =>
      createReportForModerationHandler({
        addModerationReport: null,
        getServerTimestamp: () => 'timestamp',
      })
    ).toThrow(new TypeError('addModerationReport must be a function'));
  });

  it('throws when getServerTimestamp is not a function', () => {
    expect(() =>
      createReportForModerationHandler({
        addModerationReport: () => {},
        getServerTimestamp: undefined,
      })
    ).toThrow(new TypeError('getServerTimestamp must be a function'));
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
      })
    ).resolves.toEqual({ status: 400, body: 'Missing or invalid variant' });

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
