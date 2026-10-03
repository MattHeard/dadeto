import { describe, expect, test, jest } from '@jest/globals';
import {
  runWithFailure,
  runWithFailureAndThen,
  sendResponseBody,
} from '../../../src/core/cloud/response-utils.js';

describe('response-utils', () => {
  test('sends the identical body with status-first method binding and a void result', () => {
    const body = ['unchanged', { value: 1 }];
    const calls = [];
    const target = {
      send(value) {
        expect(this).toBe(target);
        calls.push(['send', value]);
        return 'discarded response return';
      },
      json(value) {
        expect(this).toBe(target);
        calls.push(['json', value]);
        return 'discarded JSON return';
      },
    };
    const response = {
      status(code) {
        expect(this).toBe(response);
        calls.push(['status', code]);
        return target;
      },
    };
    expect(sendResponseBody(response, 418, body)).toBeUndefined();
    expect(calls).toEqual([
      ['status', 418],
      ['send', body],
    ]);
    expect(calls[1][1]).toBe(body);
    expect(sendResponseBody(response, 200, body, 'json')).toBeUndefined();
    expect(calls.slice(2)).toEqual([
      ['status', 200],
      ['json', body],
    ]);
    expect(calls[3][1]).toBe(body);
  });
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
