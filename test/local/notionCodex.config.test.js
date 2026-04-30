import {
  DEFAULT_NOTION_CODEX_CONFIG,
  loadNotionCodexConfig,
  normalizeNotionCodexConfig,
} from '../../src/local/notion-codex/config.js';

describe('local notion codex config', () => {
  test('normalizes defaults for the Dadeto Notion poller', () => {
    const config = normalizeNotionCodexConfig(
      {},
      '/tmp/repo',
      '/tmp/repo/tracking/notion-codex.local.json'
    );

    expect(config.notion.dadetoPageId).toBe('1f2700afc30180a3abedd568190132c3');
    expect(config.notion.taskDataSourceUrl).toBe(
      'collection://9f6bfea5-08d7-4897-b438-0d7dcb8f494a'
    );
    expect(config.notion.inboxPageIds).toEqual([
      '352700afc30180feb33cc5065a91c0ef',
    ]);
    expect(config.notion.apiTokenEnvNames).toEqual([
      'NOTION_API_KEY',
      'NOTION_TOKEN',
    ]);
    expect(config.notion.apiVersion).toBe('2026-03-11');
    expect(config.launcher).toEqual({
      command: 'codex',
      args: DEFAULT_NOTION_CODEX_CONFIG.launcher.args,
    });
    expect(config.logDir).toBe('/tmp/repo/tracking/notion-codex');
    expect(config.statePath).toBe(
      '/tmp/repo/tracking/notion-codex/status.json'
    );
  });

  test('loads missing local config as defaults', async () => {
    const config = await loadNotionCodexConfig({
      repoRoot: '/tmp/repo',
      async readFileImpl() {
        const error = new Error('missing');
        error.code = 'ENOENT';
        throw error;
      },
    });

    expect(config.configPath).toBe(
      '/tmp/repo/tracking/notion-codex.local.json'
    );
    expect(config.pollIntervalMs).toBe(60000);
  });

  test('applies explicit config overrides', () => {
    const config = normalizeNotionCodexConfig(
      {
        notion: {
          taskContext: 'Remote',
          inboxPageIds: [' a ', '', 12, 'b'],
          apiTokenEnvNames: ['CUSTOM_NOTION_TOKEN'],
          apiVersion: '2026-03-11',
        },
        launcher: {
          command: 'codex-nightly',
          args: [' exec ', '', 1, '--foo'],
        },
        logDir: 'tmp/notion',
        statePath: 'tmp/notion/status.json',
        pollIntervalMs: 5000,
      },
      '/tmp/repo',
      '/tmp/config.json'
    );

    expect(config.notion.taskContext).toBe('Remote');
    expect(config.notion.inboxPageIds).toEqual(['a', 'b']);
    expect(config.notion.apiTokenEnvNames).toEqual(['CUSTOM_NOTION_TOKEN']);
    expect(config.notion.apiVersion).toBe('2026-03-11');
    expect(config.launcher).toEqual({
      command: 'codex-nightly',
      args: ['exec', '--foo'],
    });
    expect(config.logDir).toBe('/tmp/repo/tmp/notion');
    expect(config.statePath).toBe('/tmp/repo/tmp/notion/status.json');
    expect(config.pollIntervalMs).toBe(5000);
  });
});
