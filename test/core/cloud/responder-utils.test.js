import { describe, expect, test, jest } from '@jest/globals';
import { createResponder } from '../../../src/core/cloud/responder-utils.js';

describe('createResponder', () => {
  test('validates dependencies before building the handler', () => {
    const handler = jest.fn(() => 'handler');
    const created = createResponder({
      dependencies: {
        randomUUID: () => 'uuid',
        getServerTimestamp: () => 'ts',
        extra: true,
      },
      requiredFunctionNames: ['randomUUID', 'getServerTimestamp'],
      handlerFactory: deps => handler(deps),
    });

    expect(created).toBe('handler');
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        randomUUID: expect.any(Function),
        getServerTimestamp: expect.any(Function),
      })
    );
  });
});
