import { jest } from '@jest/globals';

import { createObjectProxyHandler } from '../../../docker/gcs-proxy/app.js';

describe('gcs proxy app', () => {
  test('serves object metadata headers before streaming the object body', async () => {
    const createReadStream = jest.fn(() =>
      createMockStream('export const loaded = true;')
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
    const handleObjectRequest = createObjectProxyHandler({
      storage,
      bucket: 'bucket-name',
      objectPrefix: 't-123',
    });
    const response = createMockResponse();

    await handleObjectRequest({ path: '/moderate.js' }, response);

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain(
      'application/javascript'
    );
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body).toBe('export const loaded = true;');
    expect(bucket).toHaveBeenCalledWith('bucket-name');
    expect(file).toHaveBeenCalledWith('t-123/moderate.js');
  });
});

/**
 * Create a minimal response double for the proxy handler.
 * @returns {{
 *   statusCode: number,
 *   headers: Record<string, string>,
 *   body: string,
 *   set: (name: string, value: string) => unknown,
 *   status: (statusCode: number) => unknown,
 *   send: (body: string) => unknown,
 *   end: (body?: string) => unknown
 * }} Response double.
 */
function createMockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    set(name, value) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
    end(body) {
      this.body = body ?? this.body;
      return this;
    },
  };
}

/**
 * Create a minimal readable stream double that pipes fixed content.
 * @param {string} body Stream body.
 * @returns {{
 *   on: (event: string, handler: () => void) => unknown,
 *   pipe: (target: { end: (body?: string) => void }) => unknown
 * }} Readable stream double.
 */
function createMockStream(body) {
  const handlers = {};

  return {
    on(event, handler) {
      handlers[event] = handler;
      return this;
    },
    pipe(target) {
      target.end(body);
      if (handlers.end) {
        handlers.end();
      }
      return target;
    },
  };
}
