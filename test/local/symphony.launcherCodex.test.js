import { createCodexRalphLauncher } from '../../src/local/symphony/launcherCodex.js';

describe('local symphony codex launcher', () => {
  test('spawns a detached codex exec session with the Ralph prompt contract', async () => {
    /** @type {Array<{ command: string, args: string[], options: Record<string, unknown> }>} */
    const calls = [];
    let unrefCalled = false;
    const launcher = createCodexRalphLauncher({
      command: 'codex',
      args: [
        'exec',
        '--skip-git-repo-check',
        '--model',
        'gpt-5-mini',
        '--sandbox',
        'workspace-write',
        '--ask-for-approval',
        'never',
      ],
      cwd: '/tmp/repo',
      spawnImpl(command, args, options) {
        calls.push({ command, args, options });
        return {
          pid: 43210,
          unref() {
            unrefCalled = true;
          },
        };
      },
    });

    const result = await launcher.launchRunner({
      repoRoot: '/tmp/repo',
      beadId: 'dadeto-0fzi',
      beadTitle:
        'Invoke a real Ralph agent session from Symphony runner launch',
      runId: '2026-03-08T19:20:00.000Z--dadeto-0fzi',
    });

    expect(unrefCalled).toBe(true);
    expect(calls).toEqual([
      {
        command: 'codex',
        args: [
          'exec',
          '--skip-git-repo-check',
          '--model',
          'gpt-5-mini',
          '--sandbox',
          'workspace-write',
          '--ask-for-approval',
          'never',
          [
            'you are ralph',
            'pop dadeto-0fzi',
            'bead title: Invoke a real Ralph agent session from Symphony runner launch',
            'run id: 2026-03-08T19:20:00.000Z--dadeto-0fzi',
          ].join('\n'),
        ],
        options: {
          cwd: '/tmp/repo',
          detached: true,
          stdio: 'ignore',
        },
      },
    ]);
    expect(result).toEqual({
      launcherKind: 'codex',
      command: 'codex',
      args: calls[0].args,
      pid: 43210,
    });
  });
});
