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

  test('writes a visible launched-run status and launch log for the selected bead', async () => {
    const statusStore = createSymphonyStatusStore({
      statusPath: path.join(tempDir, 'tracking', 'symphony', 'status.json'),
      logDir: path.join(tempDir, 'tracking', 'symphony'),
    });

    const launchedStatus = await launchSelectedRunnerLoop({
      status: {
        service: 'dadeto-local-symphony',
        startedAt: '2026-03-08T19:14:00.000Z',
        state: 'ready',
        currentBeadId: 'dadeto-u210',
        currentBeadTitle:
          'Launch one runner loop for the selected Symphony bead',
        currentBeadPriority: '● P2',
        queueEvidence: [
          'dadeto-u210 (● P2) Launch one runner loop for the selected Symphony bead',
        ],
      },
      statusStore,
      now: () => new Date('2026-03-08T19:15:00.000Z'),
    });

    expect(launchedStatus).toMatchObject({
      state: 'running',
      currentBeadId: 'dadeto-u210',
      operatorRecommendation:
        'Wait for the runner loop on dadeto-u210 to finish before launching another bead.',
      activeRun: {
        runId: '2026-03-08T19:15:00.000Z--dadeto-u210',
        startedAt: '2026-03-08T19:15:00.000Z',
        beadId: 'dadeto-u210',
        launchRequest: 'pop dadeto-u210',
        state: 'running',
      },
    });

    await expect(statusStore.readStatus()).resolves.toMatchObject({
      state: 'running',
      currentBeadId: 'dadeto-u210',
      activeRun: {
        runId: '2026-03-08T19:15:00.000Z--dadeto-u210',
        beadId: 'dadeto-u210',
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
    ).resolves.toContain('"launchRequest": "pop dadeto-u210"');
  });
});
