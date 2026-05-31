import { jest } from '@jest/globals';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  createDetachedProcessLauncher,
  launchDetachedProcessWithRunLogs,
} from '../../../src/core/local/process-launcher.js';

describe('process launcher helpers', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await mkdtemp(
      path.join(os.tmpdir(), 'dadeto-process-launcher-')
    );
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test('launchDetachedProcessWithRunLogs uses the default fs and spawn plumbing', async () => {
    const result = await launchDetachedProcessWithRunLogs({
      command: process.execPath,
      args: ['-e', ''],
      repoRoot: tempDir,
      runId: '2026-05-31T18:30:00.000Z--process-launcher',
      closeErrorLabel: 'Failed to close run log handle:',
      exitErrorLabel: 'Failed to handle process exit:',
    });

    expect(result).toMatchObject({
      launcherKind: 'codex',
      command: process.execPath,
      args: ['-e', ''],
      pid: expect.any(Number),
      stdoutPath: path.join(
        tempDir,
        'tracking',
        'launcher',
        'runs',
        '2026-05-31T18-30-00.000Z--process-launcher--stdout.log'
      ),
      stderrPath: path.join(
        tempDir,
        'tracking',
        'launcher',
        'runs',
        '2026-05-31T18-30-00.000Z--process-launcher--stderr.log'
      ),
    });
  });

  test('createDetachedProcessLauncher falls back to repo-root launch settings', async () => {
    const calls = [];
    const launcher = createDetachedProcessLauncher({
      command: 'codex',
      args: ['exec'],
      closeErrorLabel: 'Failed to close run log handle:',
      exitErrorLabel: 'Failed to handle process exit:',
      openImpl: async filePath => ({
        fd: filePath.endsWith('--stdout.log') ? 40 : 41,
        close: () => Promise.resolve(),
      }),
      spawnImpl(command, args, options) {
        calls.push({ command, args, options });
        return {
          pid: 12345,
          once() {},
          unref() {},
        };
      },
    });

    const result = await launcher.launch({
      repoRoot: tempDir,
      runId: '2026-05-31T18:31:00.000Z--process-launcher',
      prompt: 'launch me',
    });

    expect(calls).toEqual([
      {
        command: 'codex',
        args: ['exec', 'launch me'],
        options: {
          cwd: tempDir,
          detached: true,
          stdio: ['ignore', 40, 41],
        },
      },
    ]);
    expect(result.stdoutPath).toBe(
      path.join(
        tempDir,
        'tracking',
        'launcher',
        'runs',
        '2026-05-31T18-31-00.000Z--process-launcher--stdout.log'
      )
    );
    expect(result.stderrPath).toBe(
      path.join(
        tempDir,
        'tracking',
        'launcher',
        'runs',
        '2026-05-31T18-31-00.000Z--process-launcher--stderr.log'
      )
    );
    expect(result.pid).toBe(12345);
  });

  test('createDetachedProcessLauncher honors custom cwd and log-dir resolvers', async () => {
    const calls = [];
    const launcher = createDetachedProcessLauncher({
      command: 'codex',
      args: ['exec'],
      closeErrorLabel: 'Failed to close run log handle:',
      exitErrorLabel: 'Failed to handle process exit:',
      resolveCwd: payload => path.join(payload.repoRoot, 'custom-cwd'),
      resolveLogDir: payload => path.join(payload.repoRoot, 'custom-logs'),
      openImpl: async filePath => ({
        fd: filePath.endsWith('--stdout.log') ? 40 : 41,
        close: () => Promise.resolve(),
      }),
      spawnImpl(command, args, options) {
        calls.push({ command, args, options });
        return {
          pid: 12345,
          once() {},
          unref() {},
        };
      },
    });

    const result = await launcher.launch({
      repoRoot: tempDir,
      runId: '2026-05-31T18:33:00.000Z--process-launcher',
      prompt: 'launch me',
    });

    expect(calls).toEqual([
      {
        command: 'codex',
        args: ['exec', 'launch me'],
        options: {
          cwd: path.join(tempDir, 'custom-cwd'),
          detached: true,
          stdio: ['ignore', 40, 41],
        },
      },
    ]);
    expect(result.stdoutPath).toBe(
      path.join(
        tempDir,
        'custom-logs',
        'runs',
        '2026-05-31T18-33-00.000Z--process-launcher--stdout.log'
      )
    );
    expect(result.stderrPath).toBe(
      path.join(
        tempDir,
        'custom-logs',
        'runs',
        '2026-05-31T18-33-00.000Z--process-launcher--stderr.log'
      )
    );
  });

  test('builds exit payloads when the child exits with non-numeric metadata', async () => {
    const onExitCalls = [];
    let exitHandler;
    const launcher = createDetachedProcessLauncher({
      command: 'codex',
      closeErrorLabel: 'Failed to close run log handle:',
      exitErrorLabel: 'Failed to handle process exit:',
      buildExitPayload: (payload, input) => ({
        runId: input.runId,
        exitCode: input.exitCode,
        signal: input.signal,
        note: payload.note,
      }),
      openImpl: async () => ({
        fd: 40,
        close: () => Promise.resolve(),
      }),
      spawnImpl() {
        return {
          pid: 12345,
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
      repoRoot: tempDir,
      runId: '2026-05-31T18:32:00.000Z--process-launcher',
      prompt: 'launch me',
      note: 'keep metadata',
      onExit: payload => {
        onExitCalls.push(payload);
      },
    });

    await exitHandler('boom', undefined);

    expect(onExitCalls).toEqual([
      {
        runId: '2026-05-31T18:32:00.000Z--process-launcher',
        exitCode: null,
        signal: null,
        note: 'keep metadata',
      },
    ]);
  });
});
