import { jest } from '@jest/globals';
import {
  DEFAULT_SYMPHONY_CONFIG,
  normalizeSymphonyConfig,
  loadSymphonyConfig,
} from '../../../src/core/local/symphony/config.js';

describe('Symphony config', () => {
  const pathModule = { resolve: (root, ...parts) => [root, ...parts].join('/') };

  it('normalizes defaults and valid custom values', () => {
    expect(
      normalizeSymphonyConfig({
        config: null,
        repoRoot: '/repo',
        configPath: '/repo/tracking/symphony.local.json',
        pathModule,
      })
    ).toEqual({
      configPath: '/repo/tracking/symphony.local.json',
      tracker: DEFAULT_SYMPHONY_CONFIG.tracker,
      launcher: DEFAULT_SYMPHONY_CONFIG.launcher,
      workspaceRoot: '/repo/.worktrees/symphony',
      logDir: '/repo/tracking/symphony',
      statusPath: '/repo/tracking/symphony/status.json',
      pollIntervalMs: 30000,
      maxConcurrentRuns: 1,
      defaultBranch: 'main',
    });

    expect(
      normalizeSymphonyConfig({
        config: {
          tracker: { kind: 'custom', readyCommand: 'ready' },
          launcher: {
            kind: 'other',
            command: 'runner',
            args: ['--one', 2],
            mcpServers: ['linear'],
          },
          workspaceRoot: 'work',
          logDir: 'logs',
          pollIntervalMs: 500,
          maxConcurrentRuns: 3,
          defaultBranch: ' develop ',
        },
        repoRoot: '/repo',
        configPath: '/repo/config.json',
        pathModule,
      })
    ).toMatchObject({
      tracker: { kind: 'custom', readyCommand: 'ready' },
      launcher: { kind: 'other', command: 'runner', args: ['--one'], mcpServers: ['linear'] },
      workspaceRoot: '/repo/work',
      logDir: '/repo/logs',
      statusPath: '/repo/logs/status.json',
      pollIntervalMs: 500,
      maxConcurrentRuns: 3,
      defaultBranch: 'develop',
    });
  });

  it('falls back for malformed sections and values', () => {
    const result = normalizeSymphonyConfig({
      config: {
        tracker: 'bad',
        launcher: null,
        pollIntervalMs: 0,
        maxConcurrentRuns: -1,
        defaultBranch: '   ',
      },
      repoRoot: '/repo',
      configPath: '/repo/config.json',
      pathModule,
    });

    expect(result.tracker).toEqual(DEFAULT_SYMPHONY_CONFIG.tracker);
    expect(result.launcher).toEqual(DEFAULT_SYMPHONY_CONFIG.launcher);
    expect(result.pollIntervalMs).toBe(30000);
    expect(result.maxConcurrentRuns).toBe(1);
    expect(result.defaultBranch).toBe('main');
  });

  it('loads and normalizes a local JSON config through injected IO', async () => {
    const readFileImpl = jest.fn().mockResolvedValue(
      JSON.stringify({ logDir: 'custom-logs', defaultBranch: 'release' })
    );
    const result = await loadSymphonyConfig({
      repoRoot: '/repo',
      cwd: () => '/repo',
      pathModule,
      readFileImpl,
    });

    expect(readFileImpl).toHaveBeenCalled();
    expect(result.logDir).toBe('/repo/custom-logs');
    expect(result.defaultBranch).toBe('release');
    await expect(loadSymphonyConfig(undefined)).rejects.toThrow(
      'pathModule is required.'
    );
  });
});
