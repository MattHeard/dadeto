import {
  applyRunnerLaunch,
  applyRunnerLaunchFailure,
} from '../../../src/core/local/symphony.js';

describe('core local symphony launch invocation state', () => {
  test('records launcher metadata for a successful runner launch', () => {
    expect(
      applyRunnerLaunch(
        {
          state: 'ready',
          currentBeadId: 'dadeto-0fzi',
          currentBeadTitle:
            'Invoke a real Ralph agent session from Symphony runner launch',
          currentBeadPriority: '● P2',
          queueEvidence: [
            'dadeto-0fzi (● P2) Invoke a real Ralph agent session from Symphony runner launch',
          ],
        },
        {
          runId: '2026-03-08T19:30:00.000Z--dadeto-0fzi',
          startedAt: '2026-03-08T19:30:00.000Z',
          beadId: 'dadeto-0fzi',
          beadTitle:
            'Invoke a real Ralph agent session from Symphony runner launch',
          beadPriority: '● P2',
          launchRequest: 'pop dadeto-0fzi',
          launcherKind: 'codex',
          command: 'codex',
          args: [
            'exec',
            '--skip-git-repo-check',
            '--model',
            'gpt-5-mini',
            '--sandbox',
            'workspace-write',
            'you are ralph',
          ],
          pid: 43210,
          stdoutPath:
            'tracking/symphony/runs/2026-03-08T19-30-00.000Z--dadeto-0fzi--stdout.log',
          stderrPath:
            'tracking/symphony/runs/2026-03-08T19-30-00.000Z--dadeto-0fzi--stderr.log',
        }
      )
    ).toMatchObject({
      state: 'running',
      activeRun: {
        launcherKind: 'codex',
        command: 'codex',
        pid: 43210,
        stdoutPath:
          'tracking/symphony/runs/2026-03-08T19-30-00.000Z--dadeto-0fzi--stdout.log',
        stderrPath:
          'tracking/symphony/runs/2026-03-08T19-30-00.000Z--dadeto-0fzi--stderr.log',
      },
      lastLaunchAttempt: {
        outcome: 'started',
        launcherKind: 'codex',
        command: 'codex',
        pid: 43210,
        stdoutPath:
          'tracking/symphony/runs/2026-03-08T19-30-00.000Z--dadeto-0fzi--stdout.log',
        stderrPath:
          'tracking/symphony/runs/2026-03-08T19-30-00.000Z--dadeto-0fzi--stderr.log',
      },
    });
  });

  test('records a blocked launch failure with retry guidance', () => {
    expect(
      applyRunnerLaunchFailure(
        {
          state: 'ready',
          currentBeadId: 'dadeto-0fzi',
          currentBeadTitle:
            'Invoke a real Ralph agent session from Symphony runner launch',
          currentBeadPriority: '● P2',
          queueEvidence: [],
        },
        {
          startedAt: '2026-03-08T19:31:00.000Z',
          beadId: 'dadeto-0fzi',
          beadTitle:
            'Invoke a real Ralph agent session from Symphony runner launch',
          beadPriority: '● P2',
          launchRequest: 'pop dadeto-0fzi',
          error: 'spawn codex ENOENT',
        }
      )
    ).toMatchObject({
      state: 'blocked',
      latestEvidence:
        'Runner launch failed for dadeto-0fzi: spawn codex ENOENT',
      operatorRecommendation:
        'Inspect the Ralph launcher configuration or local Codex availability before retrying this bead.',
      queueEvidence: ['dadeto-0fzi: launch failed - spawn codex ENOENT'],
      activeRun: null,
      lastLaunchAttempt: {
        outcome: 'failed',
        error: 'spawn codex ENOENT',
      },
    });
  });
});
