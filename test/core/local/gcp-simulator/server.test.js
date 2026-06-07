import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

describe('gcp simulator server', () => {
  /** @type {import('node:http').Server | null} */
  let server = null;
  /** @type {{ handle: () => Promise<import('node:http').Server>, sendRouteResponse: (resultPromise: Promise<{ status: number, body?: unknown }>, res: { status: (code: number) => unknown, send: (body: unknown) => void, json: (body: unknown) => void, end: () => void }) => Promise<void> } | null} */
  let serverModule = null;
  /** @type {string} */
  let baseUrl = '';

  beforeAll(async () => {
    process.env.GCP_SIMULATOR_PORT = '0';
    const importedModule = await import(
      '../../../../src/core/local/gcp-simulator/server.js'
    );
    serverModule = importedModule;
    server = await importedModule.handle();
    const address = server.address();
    if (address && typeof address === 'object') {
      baseUrl = `http://127.0.0.1:${address.port}`;
    }
  });

  afterAll(async () => {
    delete process.env.GCP_SIMULATOR_PORT;
    if (!server) {
      return;
    }

    await new Promise(resolve => server.close(resolve));
    server = null;
  });

  it('can write route responses without going through express', async () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn(),
      end: jest.fn(),
    };

    await serverModule.sendRouteResponse(Promise.resolve({ status: 200 }), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.end).toHaveBeenCalledTimes(1);

    await serverModule.sendRouteResponse(
      Promise.resolve({ status: 400, body: 'bad request' }),
      res
    );
    expect(res.send).toHaveBeenCalledWith('bad request');

    await serverModule.sendRouteResponse(
      Promise.resolve({ status: 400, body: { error: 'bad' } }),
      res
    );
    expect(res.json).toHaveBeenCalledWith({ error: 'bad' });
  });

  it('runs the server entrypoint when invoked directly', async () => {
    const child = spawn(process.execPath, [
      'src/core/local/gcp-simulator/server.js',
    ], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        GCP_SIMULATOR_PORT: '0',
      },
    });

    const [stdout] = await Promise.race([
      once(child.stdout, 'data'),
      once(child.stderr, 'data').then(([chunk]) => {
        throw new Error(String(chunk));
      }),
    ]);
    expect(String(stdout)).toMatch(
      /gcp simulator listening on http:\/\/127\.0\.0\.1:\d+/
    );
    child.kill('SIGTERM');
    await once(child, 'exit');
  });

  it('serves health, config, seed, static content, and route responses', async () => {
    const health = await fetch(`${baseUrl}/healthz`);
    expect(await health.json()).toEqual({ ok: true });

    const config = await fetch(`${baseUrl}/config.json`);
    const configBody = await config.json();
    expect(configBody.submitNewStoryUrl).toContain('/__sim/submit-new-story');
    expect(configBody.generateStatsUrl).toContain('/__sim/generate-stats');

    const seed = await fetch(`${baseUrl}/seed.json`);
    const seedBody = await seed.json();
    expect(seedBody.storyTitle).toBe('E2E moderation fixture story');
    expect(seedBody.environment).toBe('local');

    const index = await fetch(`${baseUrl}/index.html`);
    expect(await index.text()).toContain('E2E moderation fixture story');

    const missingAuth = await fetch(`${baseUrl}/__sim/get-moderation-variant`);
    expect(missingAuth.status).toBe(401);
    expect(await missingAuth.text()).toBe('Invalid or expired token');

    const submitStory = await fetch(`${baseUrl}/__sim/submit-new-story`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer local-admin-token',
      },
      body: JSON.stringify({
        title: 'Server Story',
        content: 'Server body',
        author: 'Playwright',
        option0: 'Keep going',
      }),
    });
    expect(submitStory.status).toBe(201);
    expect(await submitStory.json()).toMatchObject({ id: expect.any(String) });

    const submitPage = await fetch(`${baseUrl}/__sim/submit-new-page`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer local-admin-token',
      },
      body: JSON.stringify({
        incoming_option: '1-a-0',
        content: 'Page body',
        author: 'Playwright',
      }),
    });
    expect(submitPage.status).toBe(201);

    const getVariant = await fetch(`${baseUrl}/__sim/get-moderation-variant`, {
      headers: { authorization: 'Bearer local-admin-token' },
    });
    expect(getVariant.status).toBe(200);

    const assignJob = await fetch(`${baseUrl}/__sim/assign-moderation-job`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer local-admin-token',
      },
      body: JSON.stringify({}),
    });
    expect(assignJob.status).toBe(201);

    const invalidRating = await fetch(
      `${baseUrl}/__sim/submit-moderation-rating`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer local-admin-token',
        },
        body: JSON.stringify({ isApproved: 'maybe' }),
      }
    );
    expect(invalidRating.status).toBe(400);

    const validRating = await fetch(
      `${baseUrl}/__sim/submit-moderation-rating`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer local-admin-token',
        },
        body: JSON.stringify({ isApproved: true }),
      }
    );
    expect(validRating.status).toBe(200);

    const renderContents = await fetch(
      `${baseUrl}/__sim/trigger-render-contents`,
      {
        method: 'POST',
      }
    );
    expect(renderContents.status).toBe(200);

    const dirtyMissingPage = await fetch(
      `${baseUrl}/__sim/mark-variant-dirty`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ pageNumber: 9999, variantName: 'a' }),
      }
    );
    expect(dirtyMissingPage.status).toBe(404);

    const dirtyVariant = await fetch(`${baseUrl}/__sim/mark-variant-dirty`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ pageNumber: 1, variantName: 'a' }),
    });
    expect(dirtyVariant.status).toBe(200);

    const stats = await fetch(`${baseUrl}/__sim/generate-stats`, {
      method: 'POST',
    });
    expect(stats.status).toBe(200);
  });
});
