import { jest } from '@jest/globals';
import http from 'node:http';
import { createLocalApp } from '../../src/local/server.js';

/**
 * Start an HTTP server on an ephemeral loopback port.
 * @param {http.Server} server HTTP server.
 * @returns {Promise<number>} Bound port.
 */
function listen(server) {
  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => {
      resolve(server.address().port);
    });
  });
}

/**
 * Close an HTTP server after the route assertion finishes.
 * @param {http.Server} server HTTP server.
 * @returns {Promise<void>} Resolves after close.
 */
function close(server) {
  return new Promise(resolve => {
    server.close(resolve);
  });
}

describe('local Realtime route', () => {
  test('forwards browser SDP to the injected OpenAI exchange and returns SDP answer', async () => {
    const exchangeRealtimeCallSdp = jest.fn(async offer => ({
      sdpAnswer: `answer for ${offer}`,
      location: '/v1/realtime/calls/call_123',
    }));
    const app = createLocalApp({
      store: {},
      publicDir: '.',
      writerDir: '.',
      exchangeRealtimeCallSdp,
    });
    const server = http.createServer(app);
    const port = await listen(server);

    const response = await fetch(`http://127.0.0.1:${port}/api/realtime/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sdp',
      },
      body: 'offer-sdp',
    });
    const body = await response.text();
    await close(server);

    expect(exchangeRealtimeCallSdp).toHaveBeenCalledWith('offer-sdp');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/sdp');
    expect(response.headers.get('location')).toBe(
      '/v1/realtime/calls/call_123'
    );
    expect(body).toBe('answer for offer-sdp');
  });
});
