import { createNotionCodexLauncher } from '../../src/local/notion-codex/launcher.js';

describe('local notion codex launcher', () => {
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
});
