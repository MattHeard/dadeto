import { jest } from '@jest/globals';
import {
  sendSimulatorHttpResponse,
  setSimulatorHttpResponseHeader,
  logSimulatorRenderContentsError,
} from '../../../../src/core/local/gcp-simulator/http-response-effects.js';

describe('simulator HTTP response effects', () => {
  it('sets headers through the permission-first adapter', () => {
    const permission = Object.freeze({ response: true });
    const response = { set: jest.fn() };

    setSimulatorHttpResponseHeader(permission, response, 'Vary', 'Origin');

    expect(response.set).toHaveBeenCalledWith('Vary', 'Origin');
  });

  it('sends a status and body through the permission-first adapter', () => {
    const permission = Object.freeze({ response: true });
    const send = jest.fn();
    const response = { status: jest.fn(() => ({ send })) };

    sendSimulatorHttpResponse(permission, response, {
      status: 204,
      body: '',
      method: 'send',
    });

    expect(response.status).toHaveBeenCalledWith(204);
    expect(send).toHaveBeenCalledWith('');
  });

  it('logs errors through the permission-first adapter', () => {
    const permission = Object.freeze({ log: true });
    const error = new Error('invalidation failed');
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});

    logSimulatorRenderContentsError(permission, 'invalidation failed', error);

    expect(log).toHaveBeenCalledWith('invalidation failed', error);
    log.mockRestore();
  });
});
