import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { URL } from 'node:url';
import { test, expect } from '@playwright/test';

const PUBLIC_ROOT = path.resolve('public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.otf': 'font/otf',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

async function startPublicServer() {
  const server = createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url ?? '/', 'http://127.0.0.1');
      let pathname = decodeURIComponent(requestUrl.pathname || '/');
      if (pathname.includes('..')) {
        throw new Error('Forbidden request');
      }

      let candidate = path.join(PUBLIC_ROOT, pathname);
      let resolvedPath = await safeResolve(candidate);
      if (!resolvedPath) {
        resolvedPath = await safeResolve(path.join(PUBLIC_ROOT, 'index.html'));
      }

      if (!resolvedPath) {
        throw new Error('Asset missing');
      }

      const data = await readFile(resolvedPath);
      const ext = path.extname(resolvedPath).toLowerCase();
      const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    } catch (error) {
      res.writeHead(404);
      res.end('not found');
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  const port = typeof address === 'object' ? address.port : address;

  return {
    baseURL: `http://127.0.0.1:${port}`,
    stop: () =>
      new Promise((resolve) => {
        server.close(() => resolve());
      }),
  };
}

async function safeResolve(targetPath) {
  const normalized = path.resolve(targetPath);
  const relative = path.relative(PUBLIC_ROOT, normalized);
  if (relative.startsWith('..') || relative === '..') {
    return null;
  }

  let stats;
  try {
    stats = await stat(normalized);
  } catch {
    return null;
  }

  if (stats.isDirectory()) {
    return safeResolve(path.join(normalized, 'index.html'));
  }

  return normalized;
}

let harness;

test.describe.serial('public smoke', () => {
  test.beforeAll(async () => {
    harness = await startPublicServer();
  });

  test.afterAll(async () => {
    await harness.stop();
  });

  test('landing page loads with no browser errors', async ({ page }) => {
    const errors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push(message.text());
      }
    });

    page.on('pageerror', (error) => {
      if (error?.message) {
        errors.push(error.message);
      }
    });

    await page.goto(harness.baseURL, { waitUntil: 'networkidle' });
    await expect(page).toHaveTitle(/Matt Heard/);
    await expect(page.locator('#container')).toBeVisible();
    expect(errors, 'browser logged errors').toHaveLength(0);
  });
});
