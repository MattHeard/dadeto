import path from 'node:path';
import { describe, expect, it, afterAll } from '@jest/globals';
import { createLocalGcpSimulator } from '../../src/local/gcp-simulator/simulator.js';

let simulator;

afterAll(async () => {
  if (simulator) {
    await simulator.clear();
  }
});

describe('local gcp simulator', () => {
  it('seeds the fixture and renders the generated pages', async () => {
    simulator = await createLocalGcpSimulator({
      publicDir: path.resolve('public'),
      baseUrl: 'http://127.0.0.1:4322',
    });

    const indexFile = simulator.storage
      .bucket(simulator.bucketName)
      .file('index.html');
    const storyFile = simulator.storage
      .bucket(simulator.bucketName)
      .file('p/1a.html');
    const pendingFile = simulator.storage
      .bucket(simulator.bucketName)
      .file(`pending/${'gcp-test-fixture-story'}.json`);

    expect(await indexFile.exists()).toEqual([true]);
    expect(await storyFile.exists()).toEqual([true]);
    expect(await pendingFile.exists()).toEqual([true]);

    const [indexHtml] = await indexFile.download();
    expect(indexHtml.toString('utf8')).toContain('E2E moderation fixture story');
    expect(indexHtml.toString('utf8')).toContain('Contents');

    const [pendingJson] = await pendingFile.download();
    expect(JSON.parse(pendingJson.toString('utf8'))).toMatchObject({
      path: expect.stringMatching(/^p\/.+\.html$/),
    });
  });

  it('accepts a new story submission and refreshes contents locally', async () => {
    const response = await simulator.routes.submitNewStory({
      method: 'POST',
      body: {
        title: 'Simulator Story',
        content: 'Simulator body',
        author: 'Playwright',
        option0: 'Continue onward',
      },
      headers: { authorization: 'Bearer local-admin-token' },
      get: name =>
        name.toLowerCase() === 'authorization'
          ? 'Bearer local-admin-token'
          : null,
    });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');

    const submissionId = /** @type {{ id: string }} */ (response.body).id;
    const pendingFile = simulator.storage
      .bucket(simulator.bucketName)
      .file(`pending/${submissionId}.json`);
    const contentsFile = simulator.storage
      .bucket(simulator.bucketName)
      .file('index.html');

    expect(await pendingFile.exists()).toEqual([true]);

    const [contentsHtml] = await contentsFile.download();
    expect(contentsHtml.toString('utf8')).toContain('Simulator Story');
    expect(contentsHtml.toString('utf8')).toContain('Contents');
  });

  it('can regenerate stats from the simulated backend', async () => {
    await simulator.generateStatsCore.generate();

    const statsFile = simulator.storage
      .bucket(simulator.bucketName)
      .file('stats.html');
    expect(await statsFile.exists()).toEqual([true]);

    const [statsHtml] = await statsFile.download();
    expect(statsHtml.toString('utf8')).toContain('Number of stories:');
    expect(statsHtml.toString('utf8')).toContain('Number of pages:');
  });
});
