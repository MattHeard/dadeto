import http from 'node:http';
import { Readable } from 'node:stream';
import { jest } from '@jest/globals';

import { createApp } from '../../../docker/gcs-proxy/app.js';

/**
 * Fetch a path from a listening test server.
 * @param {http.Server} server Test HTTP server.
 * @param {string} path Request path.
 * @returns {Promise<{ response: http.IncomingMessage, body: string }>} Response and body.
 */
function createRequest(server, path) {
  const address = server.address();
  return new Promise((resolve, reject) => {
    http
      .get(
        {
          hostname: '127.0.0.1',
          port: address.port,
          path,
        },
        response => {
          let body = '';
          response.setEncoding('utf8');
          response.on('data', chunk => {
            body += chunk;
          });
          response.on('end', () => resolve({ response, body }));
        }
      )
      .on('error', reject);
  });
}

/**
 * Start an Express app on an ephemeral local port.
 * @param {import('express').Express} app Express app under test.
 * @returns {Promise<http.Server>} Listening test server.
 */
function createServer(app) {
  return new Promise(resolve => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
  });
}

describe('gcs proxy app', () => {
  test('serves object metadata headers before streaming the object body', async () => {
    const createReadStream = jest.fn(() =>
      Readable.from(['export const loaded = true;'])
    );
    const getMetadata = jest.fn(() =>
      Promise.resolve([
        {
          contentType: 'application/javascript',
          cacheControl: 'no-store',
        },
      ])
    );
    const file = jest.fn(() => ({ createReadStream, getMetadata }));
    const bucket = jest.fn(() => ({ file }));
    const storage = { bucket };
    const app = createApp({
      storage,
      bucket: 'bucket-name',
      objectPrefix: 't-123',
    });
    const server = await createServer(app);

    try {
      const { response, body } = await createRequest(server, '/moderate.js');

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain(
        'application/javascript'
      );
      expect(response.headers['cache-control']).toBe('no-store');
      expect(body).toBe('export const loaded = true;');
      expect(bucket).toHaveBeenCalledWith('bucket-name');
      expect(file).toHaveBeenCalledWith('t-123/moderate.js');
    } finally {
      server.close();
    }
  });
});
