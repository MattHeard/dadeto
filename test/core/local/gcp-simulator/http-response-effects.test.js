import { jest } from '@jest/globals';
import {
  createSimulatorSearchHttpResponseEffectAdapters,
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

  it('adapts local search response headers, statuses, and JSON delivery', () => {
    const permission = Object.freeze({ response: true });
    const json = jest.fn();
    const setHeader = jest.fn();
    const status = jest.fn(() => ({ json }));
    const response = { json, setHeader, status };
    const effects = createSimulatorSearchHttpResponseEffectAdapters(response);

    effects.setHeader(permission, 'Vary', 'Origin');
    effects.setStatus(permission, 400);
    effects.sendJson(permission, { valid: false });
    effects.sendJson(permission, { valid: true }, 204);

    expect(setHeader).toHaveBeenCalledWith('Vary', 'Origin');
    expect(status.mock.calls).toEqual([[400], [204]]);
    expect(json).toHaveBeenCalledWith({ valid: false });
    expect(json).toHaveBeenCalledWith({ valid: true });
  });

  it('allows local search responses without a header writer', () => {
    const response = {
      json: jest.fn(),
      status: jest.fn(),
    };
    const effects = createSimulatorSearchHttpResponseEffectAdapters(response);

    expect(
      effects.setHeader(Object.freeze({ response: true }), 'Vary', 'Origin')
    ).toBeUndefined();
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
