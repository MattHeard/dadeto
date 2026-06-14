import path from 'node:path';
import {
  resolveLocalConfigLoader,
  resolveNormalizedRepoPath,
  resolveNormalizedRepoPathWithSuffix,
  resolveNormalizedRepoPaths,
  normalizePositiveNumber,
  normalizeNonNegativeInteger,
} from '../../src/core/local/config-utils.js';
import { loadNotionCodexConfig as loadNotionCodexConfigCore } from '../../src/core/local/notion-codex/config.js';
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
      '/tmp/repo/tracking/notion-codex.local.json',
      path
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

  test('requires injected path helpers in the core loader', async () => {
    await expect(loadNotionCodexConfigCore()).rejects.toThrow();
  });

  test('resolveLocalConfigLoader requires path and readFile helpers', () => {
    expect(() =>
      resolveLocalConfigLoader(
        {},
        'configPath',
        'tracking/notion-codex.local.json'
      )
    ).toThrow('pathModule is required.');
    expect(() =>
      resolveLocalConfigLoader(
        { pathModule: path },
        'configPath',
        'tracking/notion-codex.local.json'
      )
    ).toThrow('readFileImpl is required.');
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
      '/tmp/config.json',
      path
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
      '/tmp/config.json',
      path
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
      '/tmp/config.json',
      path
    );

    expect(config.notion.inboxPageIds).toEqual(
      DEFAULT_NOTION_CODEX_CONFIG.notion.inboxPageIds
    );
    expect(config.notion.apiTokenEnvNames).toEqual(
      DEFAULT_NOTION_CODEX_CONFIG.notion.apiTokenEnvNames
    );
    expect(config.launcher.args).toEqual(
      DEFAULT_NOTION_CODEX_CONFIG.launcher.args
    );
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
      path.join(process.cwd(), 'tracking/notion-codex.local.json')
    );
    expect(config.notion).toEqual(DEFAULT_NOTION_CODEX_CONFIG.notion);
    expect(config.launcher).toEqual(DEFAULT_NOTION_CODEX_CONFIG.launcher);
  });

  test('uses cwd-based repo resolution in the core loader', async () => {
    const config = await loadNotionCodexConfigCore({
      cwd: () => '/tmp/repo',
      pathModule: path,
      async readFileImpl() {
        const error = new Error('missing');
        error.code = 'ENOENT';
        throw error;
      },
    });

    expect(config.configPath).toBe(
      '/tmp/repo/tracking/notion-codex.local.json'
    );
  });

  test('falls back to the current working directory in the core loader', async () => {
    await expect(
      loadNotionCodexConfigCore({
        pathModule: path,
        async readFileImpl() {
          const error = new Error('missing');
          error.code = 'ENOENT';
          throw error;
        },
      })
    ).resolves.toMatchObject({
      configPath: path.join(
        process.cwd(),
        'tracking',
        'notion-codex.local.json'
      ),
    });
  });

  test('normalizes numeric and path helper fallbacks directly', () => {
    expect(normalizePositiveNumber(-1, 7)).toBe(7);
    expect(normalizeNonNegativeInteger(-1, 3)).toBe(3);
    expect(
      resolveNormalizedRepoPath(
        '/tmp/repo',
        path,
        'tracking/file.txt',
        'fallback.txt'
      )
    ).toBe('/tmp/repo/tracking/file.txt');
    expect(
      resolveNormalizedRepoPathWithSuffix({
        repoRoot: '/tmp/repo',
        pathModule: path,
        value: 'tracking/file.txt',
        fallback: 'fallback.txt',
        suffix: 'status.json',
      })
    ).toBe('/tmp/repo/tracking/file.txt/status.json');
    expect(
      resolveNormalizedRepoPaths('/tmp/repo', path, {
        filePath: { value: 'tracking/file.txt', fallback: 'fallback.txt' },
        statusPath: {
          value: '',
          fallback: 'tracking/default.txt',
          suffix: 'status.json',
        },
      })
    ).toEqual({
      filePath: '/tmp/repo/tracking/file.txt',
      statusPath: '/tmp/repo/tracking/default.txt/status.json',
    });
  });
});
