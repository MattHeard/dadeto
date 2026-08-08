import { describe, expect, jest, test } from '@jest/globals';
import {
  createCloudSubmitHandler,
  createResponderHandler,
  sendResponderResult,
} from '../../../src/core/cloud/submit-shared.js';

const responseForJson = () => {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  return { response: { status }, json, status };
};

describe('submit-shared coverage paths', () => {
  test('sends object results as JSON', () => {
    const { response, status, json } = responseForJson();
    const body = { accepted: true };

    sendResponderResult(response, 201, body);

    expect(status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith(body);
  });

  test('sends undefined results as a status-only response', () => {
    const sendStatus = jest.fn();

    sendResponderResult({ sendStatus }, 204, undefined);

    expect(sendStatus).toHaveBeenCalledWith(204);
  });

  test('sends primitive results through the default response handler', () => {
    const send = jest.fn();
    const status = jest.fn(() => ({ send }));

    sendResponderResult({ status }, 200, 'accepted');

    expect(status).toHaveBeenCalledWith(200);
    expect(send).toHaveBeenCalledWith('accepted');
  });

  test('normalizes the request before invoking the responder', async () => {
    const normalizedRequest = { value: 'normalized' };
    const normalizeRequest = jest.fn(() => normalizedRequest);
    const responder = jest.fn(async request => ({
      status: 202,
      body: { request },
    }));
    const { response, status, json } = responseForJson();
    const handler = createResponderHandler(responder, normalizeRequest);

    await handler('raw request', response);

    expect(normalizeRequest).toHaveBeenCalledWith('raw request');
    expect(responder).toHaveBeenCalledWith(normalizedRequest);
    expect(status).toHaveBeenCalledWith(202);
    expect(json).toHaveBeenCalledWith({ request: normalizedRequest });
  });

  test('creates a cloud submit handler and validates responders', async () => {
    const responder = jest.fn(async () => ({ status: 204 }));
    const handler = createCloudSubmitHandler(responder);
    const sendStatus = jest.fn();

    await handler({}, { sendStatus });

    expect(responder).toHaveBeenCalled();
    expect(sendStatus).toHaveBeenCalledWith(204);
    expect(() => createCloudSubmitHandler(null)).toThrow(
      'responder must be a function'
    );
  });
});
