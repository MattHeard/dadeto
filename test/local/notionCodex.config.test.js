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
    expect(config.notion.symphonyPageId).toBe(
      '352700afc30180feb33cc5065a91c0ef'
    );
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
    expect(config.idleBackoff).toEqual({
      baseDelayMs: 60000,
      initialExponent: 0,
      maxExponent: 9,
    });
  });

  test('applies explicit config overrides', () => {
    const config = normalizeNotionCodexConfig(
      {
        notion: {
          symphonyPageId: 'symphony-page',
          symphonyPageUrl: 'https://notion.example/symphony',
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
        outcomeDir: 'tmp/notion/outcomes',
        pollIntervalMs: 5000,
        idleBackoff: {
          baseDelayMs: 120000,
          initialExponent: 1,
          maxExponent: 4,
        },
      },
      '/tmp/repo',
      '/tmp/config.json'
    );

    expect(config.notion.symphonyPageId).toBe('symphony-page');
    expect(config.notion.symphonyPageUrl).toBe(
      'https://notion.example/symphony'
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
    expect(config.outcomeDir).toBe('/tmp/repo/tmp/notion/outcomes');
    expect(config.statePath).toBe('/tmp/repo/tmp/notion/status.json');
    expect(config.pollIntervalMs).toBe(5000);
    expect(config.idleBackoff).toEqual({
      baseDelayMs: 120000,
      initialExponent: 1,
      maxExponent: 4,
    });
  });

  test('falls back to defaults when config is not an object', () => {
    const config = normalizeNotionCodexConfig(
      null,
      '/tmp/repo',
      '/tmp/config.json'
    );

    expect(config.notion).toEqual(DEFAULT_NOTION_CODEX_CONFIG.notion);
    expect(config.launcher).toEqual(DEFAULT_NOTION_CODEX_CONFIG.launcher);
    expect(config.idleBackoff).toEqual(DEFAULT_NOTION_CODEX_CONFIG.idleBackoff);
  });

  test('falls back to defaults when array inputs normalize to nothing', () => {
    const config = normalizeNotionCodexConfig(
      {
        notion: {
          inboxPageIds: ['', 0, null],
          apiTokenEnvNames: [],
        },
        launcher: {
          args: ['', null, 0],
        },
      },
      '/tmp/repo',
      '/tmp/config.json'
    );

    expect(config.notion.inboxPageIds).toEqual(
      DEFAULT_NOTION_CODEX_CONFIG.notion.inboxPageIds
    );
    expect(config.notion.apiTokenEnvNames).toEqual(
      DEFAULT_NOTION_CODEX_CONFIG.notion.apiTokenEnvNames
    );
    expect(config.launcher.args).toEqual(DEFAULT_NOTION_CODEX_CONFIG.launcher.args);
  });

  test('loads a config file and rethrows unexpected file errors', async () => {
    const loaded = await loadNotionCodexConfig({
      repoRoot: '/tmp/repo',
      async readFileImpl() {
        return JSON.stringify({
          pollIntervalMs: 15000,
          idleBackoff: {
            baseDelayMs: 90000,
            initialExponent: 2,
            maxExponent: 5,
          },
        });
      },
    });

    expect(loaded.pollIntervalMs).toBe(15000);
    expect(loaded.idleBackoff).toEqual({
      baseDelayMs: 90000,
      initialExponent: 2,
      maxExponent: 5,
    });

    await expect(
      loadNotionCodexConfig({
        repoRoot: '/tmp/repo',
        async readFileImpl() {
          throw new Error('boom');
        },
      })
    ).rejects.toThrow('boom');
  });

  test('loads defaults when called without options', async () => {
    const config = await loadNotionCodexConfig();

    expect(config.configPath).toBe(
      '/home/matt/dadeto/tracking/notion-codex.local.json'
    );
    expect(config.notion).toEqual(DEFAULT_NOTION_CODEX_CONFIG.notion);
    expect(config.launcher).toEqual(DEFAULT_NOTION_CODEX_CONFIG.launcher);
  });
});
