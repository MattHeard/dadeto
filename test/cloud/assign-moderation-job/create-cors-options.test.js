import { describe, expect, jest, test } from '@jest/globals';
import { createCorsOptions } from '../../../src/core/cloud/assign-moderation-job/assign-moderation-job-core.js';

describe('createCorsOptions', () => {
  test('builds the cors options from environment helpers', () => {
    const environmentVariables = { DENDRITE_ENVIRONMENT: 'test' };
    const getAllowedOrigins = jest.fn(() => ['https://allowed.example']);
    const getEnvironmentVariables = jest
      .fn()
      .mockReturnValue(environmentVariables);

    const corsOptions = createCorsOptions(
      getAllowedOrigins,
      getEnvironmentVariables
    );

    expect(getEnvironmentVariables).toHaveBeenCalledWith();
    expect(getAllowedOrigins).toHaveBeenCalledWith(environmentVariables);
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
