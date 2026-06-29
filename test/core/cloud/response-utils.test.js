import { describe, expect, test, jest } from '@jest/globals';
import {
  runWithFailure,
  runWithFailureAndThen,
} from '../../../src/core/cloud/response-utils.js';

describe('response-utils', () => {
  test('returns the resolved value when the action succeeds', async () => {
    const action = jest.fn().mockResolvedValue('ok');
    const onFailure = jest.fn();

    await expect(runWithFailure(action, onFailure)).resolves.toEqual({
      ok: true,
      value: 'ok',
    });

    expect(onFailure).not.toHaveBeenCalled();
  });

  test('reports failures through the failure handler', async () => {
    const error = new Error('boom');
    const action = jest.fn().mockRejectedValue(error);
    const onFailure = jest.fn();

    await expect(runWithFailure(action, onFailure)).resolves.toEqual({
      ok: false,
    });

    expect(onFailure).toHaveBeenCalledWith(error);
  });

  test('calls the success handler only when the action succeeds', async () => {
    const onFailure = jest.fn();
    const onSuccess = jest.fn();

    await expect(
      runWithFailureAndThen(() => Promise.resolve(123), onFailure, onSuccess)
    ).resolves.toBe(true);
    expect(onSuccess).toHaveBeenCalledWith(123);

    onFailure.mockClear();
    onSuccess.mockClear();

    await expect(
      runWithFailureAndThen(
        () => Promise.reject(new Error('fail')),
        onFailure,
        onSuccess
      )
    ).resolves.toBe(false);
    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
