import { describe, expect, jest, test } from '@jest/globals';
import { createCorsOptions } from '../../../src/core/cloud/assign-moderation-job/assign-moderation-job-core.js';

describe('createCorsOptions', () => {
  test('builds the cors options from environment helpers', () => {
    const allowEffects =
      /** @type {import('../../../types/allow-effects').AllowEffects} */ ({});
    const environmentVariables = { DENDRITE_ENVIRONMENT: 'test' };
    const getAllowedOrigins = jest.fn(() => ['https://allowed.example']);
    const logDebug = jest.fn();
    const getEnvironmentVariables = jest
      .fn()
      .mockReturnValue(environmentVariables);

    const corsOptions = createCorsOptions(
      allowEffects,
      getAllowedOrigins,
      getEnvironmentVariables,
      logDebug
    );

    expect(getEnvironmentVariables).toHaveBeenCalledWith();
    expect(getAllowedOrigins).toHaveBeenCalledWith(
      allowEffects,
      environmentVariables,
      logDebug
    );
    const allowCallback = jest.fn();
    corsOptions.origin('https://allowed.example', allowCallback);
    expect(allowCallback).toHaveBeenCalledWith(null, true);

    const rejectCallback = jest.fn();
    corsOptions.origin('https://blocked.example', rejectCallback);
    const [error] = rejectCallback.mock.calls[0];
    expect(error).toEqual(new Error('CORS'));

    expect(corsOptions.methods).toEqual(['POST']);
  });
});
