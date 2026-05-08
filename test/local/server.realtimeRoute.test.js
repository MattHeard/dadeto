import { jest } from '@jest/globals';
import http from 'node:http';
import {
  createLocalApp,
  createWriterServer,
  getWriterUrl,
  isWriterHttpsEnabled,
  readWriterTlsOptions,
} from '../../src/local/server.js';

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

describe('local writer server transport', () => {
  test('uses HTTP by default', () => {
    const app = {};
    const server = {};
    const httpCreateServer = jest.fn(() => server);
    const httpsCreateServer = jest.fn();

    expect(
      createWriterServer(app, {
        env: {},
        httpCreateServer,
        httpsCreateServer,
      })
    ).toBe(server);
    expect(httpCreateServer).toHaveBeenCalledWith(app);
    expect(httpsCreateServer).not.toHaveBeenCalled();
    expect(getWriterUrl(4321, {})).toBe('http://localhost:4321/writer/');
  });

  test('uses HTTPS when WRITER_HTTPS is enabled', () => {
    const app = {};
    const server = {};
    const env = {
      WRITER_HTTPS: 'true',
      WRITER_TLS_KEY: 'certs/dadeto-key.pem',
      WRITER_TLS_CERT: 'certs/dadeto.pem',
    };
    const readFile = jest.fn(path => `${path} contents`);
    const httpCreateServer = jest.fn();
    const httpsCreateServer = jest.fn(() => server);

    expect(
      createWriterServer(app, {
        env,
        readFile,
        httpCreateServer,
        httpsCreateServer,
      })
    ).toBe(server);
    expect(isWriterHttpsEnabled(env)).toBe(true);
    expect(httpsCreateServer).toHaveBeenCalledWith(
      {
        key: 'certs/dadeto-key.pem contents',
        cert: 'certs/dadeto.pem contents',
      },
      app
    );
    expect(httpCreateServer).not.toHaveBeenCalled();
    expect(getWriterUrl(4321, env)).toBe('https://localhost:4321/writer/');
  });

  test('requires key and certificate paths for HTTPS mode', () => {
    expect(() =>
      readWriterTlsOptions({ WRITER_HTTPS: '1', WRITER_TLS_CERT: 'cert.pem' })
    ).toThrow('WRITER_TLS_KEY is required when WRITER_HTTPS is enabled.');
    expect(() =>
      readWriterTlsOptions({ WRITER_HTTPS: '1', WRITER_TLS_KEY: 'key.pem' })
    ).toThrow('WRITER_TLS_CERT is required when WRITER_HTTPS is enabled.');
  });
});
