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
        config: {
          launcher: {
            kind: 'codex',
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
              'gpt-5-mini',
              '--sandbox',
              'workspace-write',
              '--ask-for-approval',
              'never',
              'you are ralph',
            ],
            pid: 43210,
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
      },
    ]);
    expect(launchedStatus).toMatchObject({
      state: 'running',
      currentBeadId: 'dadeto-0fzi',
      activeRun: {
        runId: '2026-03-08T19:15:00.000Z--dadeto-0fzi',
        pid: 43210,
        launcherKind: 'codex',
      },
      lastLaunchAttempt: {
        outcome: 'started',
        pid: 43210,
      },
    });

    await expect(statusStore.readStatus()).resolves.toMatchObject({
      state: 'running',
      currentBeadId: 'dadeto-0fzi',
      activeRun: {
        runId: '2026-03-08T19:15:00.000Z--dadeto-0fzi',
        pid: 43210,
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

    await expect(
      readFile(
        path.join(
          tempDir,
          'tracking',
          'symphony',
          'runs',
          '2026-03-08T19-16-00.000Z--launch-failed.log'
        ),
        'utf8'
      )
    ).resolves.toContain('"event": "launch-failed"');
  });
});
