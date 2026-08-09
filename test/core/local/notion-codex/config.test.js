import { jest } from '@jest/globals';
import {
  DEFAULT_NOTION_CODEX_CONFIG,
  loadNotionCodexConfig,
  normalizeNotionCodexConfig,
} from '../../../../src/core/local/notion-codex/config.js';

describe('notion codex config', () => {
  const pathModule = { resolve: (root, value) => `${root}/${value}` };

  test('normalizes defaults and resolves configured paths', () => {
    const config = normalizeNotionCodexConfig({}, '/repo', '/config.json', pathModule);
    expect(config).toMatchObject({
      configPath: '/config.json',
      pollIntervalMs: DEFAULT_NOTION_CODEX_CONFIG.pollIntervalMs,
      maxConcurrentRuns: 1,
      logDir: '/repo/tracking/notion-codex',
      outcomeDir: '/repo/tracking/notion-codex/outcomes',
      statePath: '/repo/tracking/notion-codex/status.json',
    });
    expect(config.notion.apiVersion).toBe('2026-03-11');
  });

  test('normalizes invalid values and nested overrides', () => {
    const config = normalizeNotionCodexConfig(
      {
        notion: { taskContext: 7, inboxPageIds: ['inbox'] },
        launcher: { command: 'codex-test', args: ['--json'] },
        pollIntervalMs: 0,
        idleBackoff: { baseDelayMs: 10, initialExponent: -1, maxExponent: 2 },
        maxConcurrentRuns: 2,
        logDir: 'logs',
      },
      '/repo',
      '/config.json',
      pathModule
    );
    expect(config.notion.taskContext).toBe(DEFAULT_NOTION_CODEX_CONFIG.notion.taskContext);
    expect(config.notion.inboxPageIds).toEqual(['inbox']);
    expect(config.launcher).toEqual({ command: 'codex-test', args: ['--json'] });
    expect(config.pollIntervalMs).toBe(DEFAULT_NOTION_CODEX_CONFIG.pollIntervalMs);
    expect(config.idleBackoff).toEqual({ baseDelayMs: 10, initialExponent: 0, maxExponent: 2 });
    expect(config.logDir).toBe('/repo/logs');
  });

  test('loads configured JSON and uses missing-file fallback', async () => {
    const readFileImpl = jest.fn(async () => JSON.stringify({ maxConcurrentRuns: 3 }));
    await expect(loadNotionCodexConfig({ repoRoot: '/repo', pathModule, readFileImpl }))
      .resolves.toMatchObject({ maxConcurrentRuns: 3 });

    const missing = Object.assign(new Error('missing'), { code: 'ENOENT' });
    await expect(loadNotionCodexConfig({
      repoRoot: '/repo', pathModule,
      readFileImpl: async () => { throw missing; },
    })).resolves.toMatchObject({ maxConcurrentRuns: 1 });
  });

  test('accepts omitted load options', async () => {
    await expect(loadNotionCodexConfig()).rejects.toThrow('pathModule is required.');
  });
});
