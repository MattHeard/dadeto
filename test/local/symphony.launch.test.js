import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { launchSelectedRunnerLoop } from '../../src/local/symphony/launch.js';
import { createSymphonyStatusStore } from '../../src/local/symphony/statusStore.js';

describe('local symphony runner launch', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'dadeto-symphony-launch-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test('invokes the configured Ralph launcher and writes launch artifacts on success', async () => {
    const statusStore = createSymphonyStatusStore({
      statusPath: path.join(tempDir, 'tracking', 'symphony', 'status.json'),
      logDir: path.join(tempDir, 'tracking', 'symphony'),
    });
    /** @type {unknown[]} */
    const launchCalls = [];

    const launchedStatus = await launchSelectedRunnerLoop({
      repoRoot: tempDir,
      status: {
        service: 'dadeto-local-symphony',
        startedAt: '2026-03-08T19:14:00.000Z',
        state: 'ready',
        currentBeadId: 'dadeto-0fzi',
        currentBeadTitle:
          'Invoke a real Ralph agent session from Symphony runner launch',
        currentBeadPriority: '● P2',
        operatorArtifacts: {
          statusPath: path.join(tempDir, 'tracking', 'symphony', 'status.json'),
          runsDir: path.join(tempDir, 'tracking', 'symphony', 'runs'),
        },
        config: {
          launcher: {
            kind: 'codex',
            command: 'codex',
            args: [
              'exec',
              '--skip-git-repo-check',
              '--model',
              'gpt-5.1-codex-mini',
              '--sandbox',
              'workspace-write',
            ],
          },
        },
      },
      launcher: {
        async launchRunner(payload) {
          launchCalls.push(payload);
          return {
            launcherKind: 'codex',
            command: 'codex',
            args: [
              'exec',
              '--skip-git-repo-check',
              '--model',
              'gpt-5.1-codex-mini',
              '--sandbox',
              'workspace-write',
              'you are ralph',
            ],
            pid: 43210,
            stdoutPath: path.join(
              tempDir,
              'tracking',
              'symphony',
              'runs',
              '2026-03-08T19-15-00.000Z--dadeto-0fzi--stdout.log'
            ),
            stderrPath: path.join(
              tempDir,
              'tracking',
              'symphony',
              'runs',
              '2026-03-08T19-15-00.000Z--dadeto-0fzi--stderr.log'
            ),
          };
        },
      },
      statusStore,
      now: () => new Date('2026-03-08T19:15:00.000Z'),
    });

    expect(launchCalls).toEqual([
      {
        repoRoot: tempDir,
        beadId: 'dadeto-0fzi',
        beadTitle:
          'Invoke a real Ralph agent session from Symphony runner launch',
        runId: '2026-03-08T19:15:00.000Z--dadeto-0fzi',
        onExit: expect.any(Function),
      },
    ]);
    expect(launchedStatus).toMatchObject({
      state: 'running',
      currentBeadId: 'dadeto-0fzi',
      operatorRecommendation:
        `Wait for the runner loop on dadeto-0fzi to finish before launching another bead. ` +
        'The launched Ralph process is detached and may continue even if the Symphony server stops. ' +
        `If the server is unavailable, inspect ${path.join(tempDir, 'tracking', 'symphony', 'status.json')}, ` +
        `${path.join(tempDir, 'tracking', 'symphony', 'runs', '2026-03-08T19-15-00.000Z--dadeto-0fzi--stdout.log')}, ` +
        `${path.join(tempDir, 'tracking', 'symphony', 'runs', '2026-03-08T19-15-00.000Z--dadeto-0fzi--stderr.log')}.`,
      activeRun: {
        runId: '2026-03-08T19:15:00.000Z--dadeto-0fzi',
        pid: 43210,
        launcherKind: 'codex',
        stdoutPath: path.join(
          tempDir,
          'tracking',
          'symphony',
          'runs',
          '2026-03-08T19-15-00.000Z--dadeto-0fzi--stdout.log'
        ),
        stderrPath: path.join(
          tempDir,
          'tracking',
          'symphony',
          'runs',
          '2026-03-08T19-15-00.000Z--dadeto-0fzi--stderr.log'
        ),
      },
      lastLaunchAttempt: {
        outcome: 'started',
        pid: 43210,
        stdoutPath: path.join(
          tempDir,
          'tracking',
          'symphony',
          'runs',
          '2026-03-08T19-15-00.000Z--dadeto-0fzi--stdout.log'
        ),
        stderrPath: path.join(
          tempDir,
          'tracking',
          'symphony',
          'runs',
          '2026-03-08T19-15-00.000Z--dadeto-0fzi--stderr.log'
        ),
      },
    });

    await expect(statusStore.readStatus()).resolves.toMatchObject({
      state: 'running',
      currentBeadId: 'dadeto-0fzi',
      operatorRecommendation:
        `Wait for the runner loop on dadeto-0fzi to finish before launching another bead. ` +
        'The launched Ralph process is detached and may continue even if the Symphony server stops. ' +
        `If the server is unavailable, inspect ${path.join(tempDir, 'tracking', 'symphony', 'status.json')}, ` +
        `${path.join(tempDir, 'tracking', 'symphony', 'runs', '2026-03-08T19-15-00.000Z--dadeto-0fzi--stdout.log')}, ` +
        `${path.join(tempDir, 'tracking', 'symphony', 'runs', '2026-03-08T19-15-00.000Z--dadeto-0fzi--stderr.log')}.`,
      activeRun: {
        runId: '2026-03-08T19:15:00.000Z--dadeto-0fzi',
        pid: 43210,
        stdoutPath: path.join(
          tempDir,
          'tracking',
          'symphony',
          'runs',
          '2026-03-08T19-15-00.000Z--dadeto-0fzi--stdout.log'
        ),
        stderrPath: path.join(
          tempDir,
          'tracking',
          'symphony',
          'runs',
          '2026-03-08T19-15-00.000Z--dadeto-0fzi--stderr.log'
        ),
      },
    });

    await expect(
      readFile(
        path.join(
          tempDir,
          'tracking',
          'symphony',
          'runs',
          '2026-03-08T19-15-00.000Z--launch.log'
        ),
        'utf8'
      )
    ).resolves.toContain('"event": "launch"');
    await expect(
      readFile(
        path.join(
          tempDir,
          'tracking',
          'symphony',
          'runs',
          '2026-03-08T19-15-00.000Z--launch.log'
        ),
        'utf8'
      )
    ).resolves.toContain('"pid": 43210');
    await expect(
      readFile(
        path.join(
          tempDir,
          'tracking',
          'symphony',
          'runs',
          '2026-03-08T19-15-00.000Z--launch.log'
        ),
        'utf8'
      )
    ).resolves.toContain('--stdout.log');
    await expect(
      readFile(
        path.join(
          tempDir,
          'tracking',
          'symphony',
          'runs',
          '2026-03-08T19-15-00.000Z--launch.log'
        ),
        'utf8'
      )
    ).resolves.toContain('--stderr.log');
  });

  test('keeps the stored status idle when the runner exits before the launch write completes', async () => {
    const statusStore = createSymphonyStatusStore({
      statusPath: path.join(tempDir, 'tracking', 'symphony', 'status.json'),
      logDir: path.join(tempDir, 'tracking', 'symphony'),
    });
    let exitPromise = Promise.resolve();

    await launchSelectedRunnerLoop({
      repoRoot: tempDir,
      status: {
        service: 'dadeto-local-symphony',
        startedAt: '2026-03-08T19:14:00.000Z',
        state: 'ready',
        currentBeadId: 'dadeto-0fzi',
        currentBeadTitle:
          'Invoke a real Ralph agent session from Symphony runner launch',
        currentBeadPriority: '● P2',
        operatorArtifacts: {
          statusPath: path.join(tempDir, 'tracking', 'symphony', 'status.json'),
          runsDir: path.join(tempDir, 'tracking', 'symphony', 'runs'),
        },
        config: {
          launcher: {
            kind: 'codex',
            command: 'codex',
            args: [
              'exec',
              '--skip-git-repo-check',
              '--model',
              'gpt-5.1-codex-mini',
              '--sandbox',
              'workspace-write',
            ],
          },
        },
      },
      launcher: {
        async launchRunner(payload) {
          const invocation = {
            launcherKind: 'codex',
            command: 'codex',
            args: [
              'exec',
              '--skip-git-repo-check',
              '--model',
              'gpt-5.1-codex-mini',
              '--sandbox',
              'workspace-write',
              'you are ralph',
            ],
            pid: 43210,
            stdoutPath: path.join(
              tempDir,
              'tracking',
              'symphony',
              'runs',
              '2026-03-08T19-15-05.000Z--dadeto-0fzi--stdout.log'
            ),
            stderrPath: path.join(
              tempDir,
              'tracking',
              'symphony',
              'runs',
              '2026-03-08T19-15-05.000Z--dadeto-0fzi--stderr.log'
            ),
          };

          exitPromise = payload.onExit
            ? payload.onExit({ exitCode: 0, signal: null })
            : Promise.resolve();

          return invocation;
        },
      },
      statusStore,
      now: () => new Date('2026-03-08T19:15:05.000Z'),
    });

    await exitPromise;

    await expect(statusStore.readStatus()).resolves.toMatchObject({
      state: 'idle',
      activeRun: null,
      lastOutcome: {
        beadId: 'dadeto-0fzi',
        outcome: 'completed',
      },
    });
  });

  test('records a failed launch when the Ralph launcher integration errors', async () => {
    const statusStore = createSymphonyStatusStore({
      statusPath: path.join(tempDir, 'tracking', 'symphony', 'status.json'),
      logDir: path.join(tempDir, 'tracking', 'symphony'),
    });

    const failedStatus = await launchSelectedRunnerLoop({
      repoRoot: tempDir,
      status: {
        service: 'dadeto-local-symphony',
        startedAt: '2026-03-08T19:14:00.000Z',
        state: 'ready',
        currentBeadId: 'dadeto-0fzi',
        currentBeadTitle:
          'Invoke a real Ralph agent session from Symphony runner launch',
        currentBeadPriority: '● P2',
      },
      launcher: {
        async launchRunner() {
          throw new Error('spawn codex ENOENT');
        },
      },
      statusStore,
      now: () => new Date('2026-03-08T19:16:00.000Z'),
    });

    expect(failedStatus).toMatchObject({
      state: 'blocked',
      latestEvidence:
        'Runner launch failed for dadeto-0fzi: spawn codex ENOENT',
      lastLaunchAttempt: {
        outcome: 'failed',
        error: 'spawn codex ENOENT',
      },
    });

    await expect(statusStore.readStatus()).resolves.toMatchObject({
      state: 'blocked',
      lastLaunchAttempt: {
        outcome: 'failed',
      },
    });

    const failedLaunchLogPath = path.join(
      tempDir,
      'tracking',
      'symphony',
      'runs',
      '2026-03-08T19-16-00.000Z--launch-failed.log'
    );
    const failedLaunchLogContent = await readFile(failedLaunchLogPath, 'utf8');
    expect(failedLaunchLogContent).toContain('"event": "launch-failed"');

    const failedLaunchLog = JSON.parse(failedLaunchLogContent);
    expect(failedLaunchLog.lastLaunchAttempt).toMatchObject({
      outcome: 'failed',
      error: 'spawn codex ENOENT',
    });
  });

  test('records the rejection when Symphony is not ready', async () => {
    const statusStore = createSymphonyStatusStore({
      statusPath: path.join(tempDir, 'tracking', 'symphony', 'status.json'),
      logDir: path.join(tempDir, 'tracking', 'symphony'),
    });

    await expect(
      launchSelectedRunnerLoop({
        repoRoot: tempDir,
        status: {
          service: 'dadeto-local-symphony',
          startedAt: '2026-03-08T19:14:00.000Z',
          state: 'blocked',
          currentBeadId: 'dadeto-0fzi',
          currentBeadTitle:
            'Invoke a real Ralph agent session from Symphony runner launch',
          currentBeadPriority: '● P2',
        },
        statusStore,
        now: () => new Date('2026-03-08T19:20:00.000Z'),
      })
    ).rejects.toThrow(
      'Cannot launch runner loop unless Symphony is ready. Current state: blocked.'
    );

    await expect(statusStore.readStatus()).resolves.toMatchObject({
      state: 'blocked',
      currentBeadId: 'dadeto-0fzi',
      latestEvidence:
        'Runner launch failed for dadeto-0fzi: Cannot launch runner loop unless Symphony is ready. Current state: blocked.',
      lastLaunchAttempt: {
        outcome: 'failed',
        error:
          'Cannot launch runner loop unless Symphony is ready. Current state: blocked.',
      },
    });

    const notReadyLogPath = path.join(
      tempDir,
      'tracking',
      'symphony',
      'runs',
      '2026-03-08T19-20-00.000Z--launch-failed.log'
    );
    const notReadyLog = JSON.parse(await readFile(notReadyLogPath, 'utf8'));
    expect(notReadyLog.lastLaunchAttempt).toMatchObject({
      outcome: 'failed',
      error:
        'Cannot launch runner loop unless Symphony is ready. Current state: blocked.',
    });
  });

  test('records failure reason when the selected bead id is missing', async () => {
    const statusStore = createSymphonyStatusStore({
      statusPath: path.join(tempDir, 'tracking', 'symphony', 'status.json'),
      logDir: path.join(tempDir, 'tracking', 'symphony'),
    });

    await expect(
      launchSelectedRunnerLoop({
        repoRoot: tempDir,
        status: {
          service: 'dadeto-local-symphony',
          startedAt: '2026-03-08T19:14:00.000Z',
          state: 'ready',
          currentBeadTitle:
            'Invoke a real Ralph agent session from Symphony runner launch',
          currentBeadPriority: '● P2',
        },
        statusStore,
        now: () => new Date('2026-03-08T19:21:00.000Z'),
      })
    ).rejects.toThrow('Cannot launch runner loop without currentBeadId.');

    await expect(statusStore.readStatus()).resolves.toMatchObject({
      state: 'blocked',
      currentBeadId: 'unknown-bead',
      latestEvidence:
        'Runner launch failed for unknown-bead: Cannot launch runner loop without currentBeadId.',
      lastLaunchAttempt: {
        outcome: 'failed',
        error: 'Cannot launch runner loop without currentBeadId.',
      },
    });

    const missingBeadLogPath = path.join(
      tempDir,
      'tracking',
      'symphony',
      'runs',
      '2026-03-08T19-21-00.000Z--launch-failed.log'
    );
    const missingBeadLog = JSON.parse(
      await readFile(missingBeadLogPath, 'utf8')
    );
    expect(missingBeadLog.lastLaunchAttempt).toMatchObject({
      outcome: 'failed',
      error: 'Cannot launch runner loop without currentBeadId.',
    });
  });
});
