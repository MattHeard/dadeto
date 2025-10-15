import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';
import http from 'node:http';
import { app } from '../../src/cloud/submit-new-story/index.js';

/**
 * Create a running HTTP server for the Express app.
 * @returns {Promise<{ url: string, close: () => Promise<void> }>} server details
 */
async function startServer() {
  return new Promise(resolve => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        throw new Error('Expected address info from HTTP server');
      }
      const { port } = address;
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () =>
          new Promise((closeResolve, closeReject) => {
            server.close(error => {
              if (error) {
                closeReject(error);
                return;
              }
              closeResolve();
            });
          }),
      });
    });
  });
}

describe('submitNewStory CORS handling', () => {
  let server;

  beforeAll(async () => {
    server = await startServer();
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  test('rejects disallowed origins with a 403', async () => {
    const response = await fetch(`${server.url}/`, {
      method: 'POST',
      headers: {
        Origin: 'https://example.com',
      },
    });

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toEqual({ error: 'Origin not allowed' });
  });
});
