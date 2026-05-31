import { jest } from '@jest/globals';
import { createNotionCodexLauncherCore } from '../../src/core/local/notion-codex/launcher.js';
import { createNotionCodexLauncher } from '../../src/local/notion-codex/launcher.js';

describe('local notion codex launcher', () => {
  test('uses built-in launcher defaults when custom dependencies are omitted', () => {
    const launcher = createNotionCodexLauncherCore({
      command: 'codex',
    });

    expect(launcher).toEqual(
      expect.objectContaining({ launch: expect.any(Function) })
    );
  });

  test('spawns a detached codex exec session with append-only run logs', async () => {
    const calls = [];
    const openCalls = [];
    const closeCalls = [];
    let unrefCalled = false;
    const launcher = createNotionCodexLauncher({
      command: 'codex',
      args: ['exec', '--model', 'gpt-5.4-mini'],
      cwd: '/tmp/repo',
      logDir: '/tmp/repo/tracking/notion-codex',
      async openImpl(filePath, flags) {
        openCalls.push({ path: filePath, flags });
        return {
          fd: openCalls.length + 50,
          close() {
            closeCalls.push(filePath);
            return Promise.resolve();
          },
        };
      },
      spawnImpl(command, args, options) {
        calls.push({ command, args, options });
        return {
          pid: 45678,
          once() {},
          unref() {
            unrefCalled = true;
          },
        };
      },
    });

    const result = await launcher.launch({
      repoRoot: '/tmp/repo',
      runId: '2026-04-30T07:40:00.000Z--notion-codex',
      prompt: 'poll notion',
    });

    expect(unrefCalled).toBe(true);
    expect(openCalls).toEqual([
      {
        path: '/tmp/repo/tracking/notion-codex/runs/2026-04-30T07-40-00.000Z--notion-codex--stdout.log',
        flags: 'a',
      },
      {
        path: '/tmp/repo/tracking/notion-codex/runs/2026-04-30T07-40-00.000Z--notion-codex--stderr.log',
        flags: 'a',
      },
    ]);
    expect(calls).toEqual([
      {
        command: 'codex',
        args: ['exec', '--model', 'gpt-5.4-mini', 'poll notion'],
        options: {
          cwd: '/tmp/repo',
          detached: true,
          stdio: ['ignore', 51, 52],
        },
      },
    ]);
    expect(result).toEqual({
      launcherKind: 'codex',
      command: 'codex',
      args: calls[0].args,
      pid: 45678,
      stdoutPath:
        '/tmp/repo/tracking/notion-codex/runs/2026-04-30T07-40-00.000Z--notion-codex--stdout.log',
      stderrPath:
        '/tmp/repo/tracking/notion-codex/runs/2026-04-30T07-40-00.000Z--notion-codex--stderr.log',
    });
    expect(closeCalls).toEqual([
      '/tmp/repo/tracking/notion-codex/runs/2026-04-30T07-40-00.000Z--notion-codex--stdout.log',
      '/tmp/repo/tracking/notion-codex/runs/2026-04-30T07-40-00.000Z--notion-codex--stderr.log',
    ]);
  });

  test('invokes the exit handler and logs failures from it', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    let exitHandler;
    const launcher = createNotionCodexLauncher({
      command: 'codex',
      openImpl: async () => ({
        fd: 40,
        close: () => Promise.resolve(),
      }),
      spawnImpl() {
        return {
          pid: 45678,
          once(event, handler) {
            if (event === 'exit') {
              exitHandler = handler;
            }
          },
          unref() {},
        };
      },
    });

    await launcher.launch({
      repoRoot: '/tmp/repo',
      runId: '2026-04-30T07:40:00.000Z--notion-codex',
      prompt: 'poll notion',
      onExit: () => Promise.reject(new Error('exit failed')),
    });

    await exitHandler(0, 'SIGTERM');

    expect(consoleError).toHaveBeenCalledWith(
      'Failed to handle Notion Codex exit for 2026-04-30T07:40:00.000Z--notion-codex:',
      expect.any(Error)
    );
    consoleError.mockRestore();
  });

  test('normalizes missing exit metadata and null pids', async () => {
    let exitHandler;
    const onExit = jest.fn(() => Promise.resolve());
    const launcher = createNotionCodexLauncher({
      command: 'codex',
      openImpl: async () => ({
        fd: 40,
        close: () => Promise.resolve(),
      }),
      spawnImpl() {
        return {
          once(event, handler) {
            if (event === 'exit') {
              exitHandler = handler;
            }
          },
          unref() {},
        };
      },
    });

    const result = await launcher.launch({
      repoRoot: '/tmp/repo',
      runId: '2026-04-30T07:43:00.000Z--notion-codex',
      prompt: 'poll notion',
      onExit,
    });

    await exitHandler('boom');

    expect(result.pid).toBeNull();
    expect(onExit).toHaveBeenCalledWith({
      runId: '2026-04-30T07:43:00.000Z--notion-codex',
      exitCode: null,
      signal: null,
    });
  });

  test('skips close logging when run log handles do not expose close methods', async () => {
    const mkdirCalls = [];
    const openCalls = [];
    const launcher = createNotionCodexLauncher({
      command: 'codex',
      mkdirImpl: async (...args) => {
        mkdirCalls.push(args);
      },
      openImpl: async (filePath, flags) => {
        openCalls.push({ path: filePath, flags });
        return {
          fd: openCalls.length + 60,
        };
      },
      spawnImpl() {
        return {
          pid: 45678,
          once() {},
          unref() {},
        };
      },
    });

    const result = await launcher.launch({
      repoRoot: '/tmp/repo',
      runId: '2026-04-30T07:41:00.000Z--notion-codex',
      prompt: 'poll notion',
    });

    expect(mkdirCalls).toEqual([
      ['/tmp/repo/tracking/notion-codex/runs', { recursive: true }],
    ]);
    expect(openCalls).toEqual([
      {
        path: '/tmp/repo/tracking/notion-codex/runs/2026-04-30T07-41-00.000Z--notion-codex--stdout.log',
        flags: 'a',
      },
      {
        path: '/tmp/repo/tracking/notion-codex/runs/2026-04-30T07-41-00.000Z--notion-codex--stderr.log',
        flags: 'a',
      },
    ]);
    expect(result.pid).toBe(45678);
  });

  test('logs rejected close handlers', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const launcher = createNotionCodexLauncher({
      command: 'codex',
      openImpl: async () => ({
        fd: 40,
        close: () => Promise.reject(new Error('close failed')),
      }),
      spawnImpl() {
        return {
          pid: 45678,
          once() {},
          unref() {},
        };
      },
    });

    await launcher.launch({
      repoRoot: '/tmp/repo',
      runId: '2026-04-30T07:42:00.000Z--notion-codex',
      prompt: 'poll notion',
    });

    expect(consoleError).toHaveBeenCalledWith(
      'Failed to close Notion Codex run log handle:',
      expect.any(Error)
    );
    consoleError.mockRestore();
  });
});
