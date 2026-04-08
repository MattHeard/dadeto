import { describe, expect, test, jest } from '@jest/globals';
import {
  METHOD_NOT_ALLOWED_RESPONSE,
  validatePostMethod,
  whenPostMethod,
  whenPostRequest,
  whenPostRequestAsync,
} from '../../../src/core/cloud/http-method-guard.js';

describe('http method guard', () => {
  test('accepts POST methods', () => {
    expect(validatePostMethod('POST')).toBeNull();
  });

  test('rejects non-POST methods with the default response', () => {
    expect(validatePostMethod('GET')).toBe(METHOD_NOT_ALLOWED_RESPONSE);
  });

  test('uses a custom response when one is provided', () => {
    const customResponse = { status: 418, body: 'teapot' };

    expect(validatePostMethod('DELETE', customResponse)).toBe(customResponse);
  });

  test('treats non-string methods as POST when asked', () => {
    expect(
      validatePostMethod(undefined, undefined, { treatNonStringAsPost: true })
    ).toBeNull();
  });

  test('still rejects POST-only string methods when asked to treat non-strings as POST', () => {
    expect(
      validatePostMethod('GET', undefined, { treatNonStringAsPost: true })
    ).toBe(METHOD_NOT_ALLOWED_RESPONSE);
  });

  test('runs the valid callback for POST methods', () => {
    const onValid = jest.fn().mockReturnValue('ok');
    const onInvalid = jest.fn().mockReturnValue('fail');

    expect(
      whenPostMethod({
        method: 'POST',
        onValid,
        onInvalid,
      })
    ).toBe('ok');

    expect(onValid).toHaveBeenCalledTimes(1);
    expect(onInvalid).not.toHaveBeenCalled();
  });

  test('runs the invalid callback for non-POST methods', () => {
    const onValid = jest.fn().mockReturnValue('ok');
    const onInvalid = jest.fn().mockReturnValue('fail');

    expect(
      whenPostMethod({
        method: 'GET',
        onValid,
        onInvalid,
      })
    ).toBe('fail');

    expect(onValid).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledWith(METHOD_NOT_ALLOWED_RESPONSE);
  });

  test('runs the request callback for POST requests', () => {
    const onValid = jest.fn().mockReturnValue('ok');
    const onInvalid = jest.fn().mockReturnValue('fail');

    expect(
      whenPostRequest({
        request: { method: 'POST' },
        onValid,
        onInvalid,
      })
    ).toBe('ok');

    expect(onValid).toHaveBeenCalledTimes(1);
    expect(onInvalid).not.toHaveBeenCalled();
  });

  test('runs the invalid request callback for non-POST requests', () => {
    const onValid = jest.fn().mockReturnValue('ok');
    const onInvalid = jest.fn().mockReturnValue('fail');

    expect(
      whenPostRequest({
        request: { method: 'GET' },
        onValid,
        onInvalid,
      })
    ).toBe('fail');

    expect(onValid).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledWith(METHOD_NOT_ALLOWED_RESPONSE);
  });

  test('resolves the valid async callback for POST requests', async () => {
    const onValid = jest.fn().mockResolvedValue('ok');

    await expect(
      whenPostRequestAsync({
        request: { method: 'POST' },
        onValid,
      })
    ).resolves.toBe('ok');

    expect(onValid).toHaveBeenCalledTimes(1);
  });

  test('resolves the invalid async callback for non-POST requests', async () => {
    const onValid = jest.fn().mockResolvedValue('ok');

    await expect(
      whenPostRequestAsync({
        request: { method: 'GET' },
        onValid,
      })
    ).resolves.toBe(METHOD_NOT_ALLOWED_RESPONSE);

    expect(onValid).not.toHaveBeenCalled();
  });
});
