import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import { createWriterServer as createWriterServerCore } from '../core/local/server.js';

/**
 * Create the local writer server with Node-backed defaults.
 * @param {unknown} localApp Express application.
 * @param {{
 *   env?: Record<string, string | undefined>,
 *   readFileSync?: (filePath: string, encoding: 'utf8') => string,
 *   httpCreateServer?: (app: unknown) => { listen: (...args: Array<unknown>) => void, on: (event: string, handler: (error: unknown) => void) => void },
 *   httpsCreateServer?: (options: { key: string, cert: string }, app: unknown) => { listen: (...args: Array<unknown>) => void, on: (event: string, handler: (error: unknown) => void) => void },
 * }} [options] Server options.
 * @returns {{ listen: (...args: Array<unknown>) => void, on: (event: string, handler: (error: unknown) => void) => void }} Node server.
 */
export function createWriterServer(localApp, options = {}) {
  return createWriterServerCore(localApp, {
    ...options,
    readFileSync: options.readFileSync ?? fs.readFileSync,
    httpCreateServer: options.httpCreateServer ?? http.createServer,
    httpsCreateServer: options.httpsCreateServer ?? https.createServer,
  });
}
