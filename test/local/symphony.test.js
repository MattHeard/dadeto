import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { applyRunnerOutcome } from '../../src/core/local/symphony.js';
import { bootstrapSymphony } from '../../src/local/symphony/bootstrap.js';
import { loadSymphonyConfig } from '../../src/local/symphony/config.js';
import { loadSymphonyWorkflow } from '../../src/local/symphony/workflow.js';
import { createSymphonyStatusStore } from '../../src/local/symphony/statusStore.js';

describe('local symphony scaffold', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'dadeto-symphony-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test('loads config and resolves local paths', async () => {
    await mkdir(path.join(tempDir, 'tracking'), { recursive: true });
    await writeFile(
      path.join(tempDir, 'tracking', 'symphony.local.json'),
      JSON.stringify({
        tracker: {
          kind: 'bd',
          readyCommand: 'bd ready --sort priority',
        },
        workspaceRoot: '.worktrees/symphony',
        logDir: 'tracking/symphony',
        pollIntervalMs: 45000,
        maxConcurrentRuns: 1,
        defaultBranch: 'main',
      }),
      'utf8'
    );

    const config = await loadSymphonyConfig({ repoRoot: tempDir });

    expect(config.launcher).toEqual({
      kind: 'codex',
      command: 'codex',
      args: [
        'exec',
        '--skip-git-repo-check',
        '--sandbox',
        'workspace-write',
      ],
    });
    expect(config.workspaceRoot).toBe(
      path.join(tempDir, '.worktrees', 'symphony')
    );
    expect(config.statusPath).toBe(
      path.join(tempDir, 'tracking', 'symphony', 'status.json')
    );
    expect(config.pollIntervalMs).toBe(45000);
  });

  test('parses workflow front matter and prompt template when WORKFLOW.md exists', async () => {
    await writeFile(
      path.join(tempDir, 'WORKFLOW.md'),
      [
        '---',
        'model: gpt-5',
        'max_turns: 6',
        'allow_dirty_worktree: true',
        '---',
        '',
        '# Workflow',
        '',
        '## Allowed command families',
        '- `bd`',
        '- `git`',
        '',
        '## Required quality gates',
        '- `npm test`',
        '',
        '## Handoff requirements',
        '- leave notes',
      ].join('\n'),
      'utf8'
    );

    const workflow = await loadSymphonyWorkflow({ repoRoot: tempDir });

    expect(workflow.exists).toBe(true);
    expect(workflow.config).toEqual({
      model: 'gpt-5',
      max_turns: 6,
      allow_dirty_worktree: true,
    });
    expect(workflow.prompt_template).toBe(
      [
        '# Workflow',
        '',
        '## Allowed command families',
        '- `bd`',
        '- `git`',
        '',
        '## Required quality gates',
        '- `npm test`',
        '',
        '## Handoff requirements',
        '- leave notes',
      ].join('\n')
    );
    expect(workflow.allowedCommandFamilies).toEqual(['`bd`', '`git`']);
    expect(workflow.requiredQualityGates).toEqual(['`npm test`']);
    expect(workflow.handoffRequirements).toEqual(['leave notes']);
  });

  test('bootstraps blocked status when WORKFLOW.md is missing and writes status artifacts', async () => {
    await mkdir(path.join(tempDir, 'tracking'), { recursive: true });
    await writeFile(
      path.join(tempDir, 'tracking', 'symphony.local.json'),
      JSON.stringify({
        logDir: 'tracking/symphony',
      }),
      'utf8'
    );

    const { status } = await bootstrapSymphony({
      repoRoot: tempDir,
      now: () => new Date('2026-03-06T20:00:00.000Z'),
    });

    expect(status.state).toBe('blocked');
    expect(status.workflow.exists).toBe(false);
    expect(status.workflow.config).toEqual({});
    expect(status.workflow.prompt_template).toBe('');
    expect(status.operatorRecommendation).toBe(
      'Add WORKFLOW.md so Symphony can decide what the runner should do next.'
    );
    await expect(
      readFile(
        path.join(tempDir, 'tracking', 'symphony', 'status.json'),
        'utf8'
      )
    ).resolves.toContain('"state": "blocked"');
    await expect(
      readFile(
        path.join(tempDir, 'tracking', 'symphony', 'status.json'),
        'utf8'
      )
    ).resolves.toContain(
      '"operatorRecommendation": "Add WORKFLOW.md so Symphony can decide what the runner should do next."'
    );
    await expect(
      readFile(
        path.join(
          tempDir,
          'tracking',
          'symphony',
          'runs',
          '2026-03-06T20-00-00.000Z--startup.log'
        ),
        'utf8'
      )
    ).resolves.toContain('"event": "startup"');
  });

  test('bootstraps ready status with the selected bead from tracker polling', async () => {
    await mkdir(path.join(tempDir, 'tracking'), { recursive: true });
    await writeFile(
      path.join(tempDir, 'tracking', 'symphony.local.json'),
      JSON.stringify({
        tracker: {
          kind: 'bd',
          readyCommand: 'bd ready --sort priority',
        },
        logDir: 'tracking/symphony',
      }),
      'utf8'
    );
    await writeFile(
      path.join(tempDir, 'WORKFLOW.md'),
      [
        '---',
        'model: gpt-5',
        '---',
        '',
        '# Workflow',
        '',
        '## Allowed command families',
        '- `bd`',
      ].join('\n'),
      'utf8'
    );

    const { status } = await bootstrapSymphony({
      repoRoot: tempDir,
      now: () => new Date('2026-03-06T21:00:00.000Z'),
      trackerFactory: () => ({
        async pollReadyBeads() {
          return {
            command: 'bd ready --sort priority',
            readyBeads: [
              {
                id: 'dadeto-639o',
                title:
                  'Implement Symphony tracker polling and bead selection loop',
                priority: '● P2',
              },
            ],
            queueSummary: [
              'dadeto-639o (● P2) Implement Symphony tracker polling and bead selection loop',
            ],
            selectedBead: {
              id: 'dadeto-639o',
              title:
                'Implement Symphony tracker polling and bead selection loop',
              priority: '● P2',
            },
          };
        },
      }),
    });

    expect(status.state).toBe('ready');
    expect(status.currentBeadId).toBe('dadeto-639o');
    expect(status.currentBeadPriority).toBe('● P2');
    expect(status.workflow.config).toEqual({ model: 'gpt-5' });
    expect(status.workflow.prompt_template).toBe(
      '# Workflow\n\n## Allowed command families\n- `bd`'
    );
    expect(status.lastPollSummary).toBe(
      '1 ready bead(s): dadeto-639o (● P2) Implement Symphony tracker polling and bead selection loop'
    );
    expect(status.lastPoll).toEqual({
      readyCount: 1,
      queueSummary: [
        'dadeto-639o (● P2) Implement Symphony tracker polling and bead selection loop',
      ],
      selectedBead: {
        id: 'dadeto-639o',
        title: 'Implement Symphony tracker polling and bead selection loop',
        priority: '● P2',
      },
    });
    expect(status.queueEvidence).toEqual([
      'dadeto-639o (● P2) Implement Symphony tracker polling and bead selection loop',
    ]);
    expect(status.latestEvidence).toContain(
      'selected dadeto-639o from 1 ready bead(s):'
    );
    expect(status.operatorRecommendation).toBe(
      'Run the next worker loop on dadeto-639o.'
    );
    await expect(
      readFile(
        path.join(
          tempDir,
          'tracking',
          'symphony',
          'runs',
          '2026-03-06T21-00-00.000Z--startup.log'
        ),
        'utf8'
      )
    ).resolves.toContain('"currentBeadId": "dadeto-639o"');
    await expect(
      readFile(
        path.join(
          tempDir,
          'tracking',
          'symphony',
          'runs',
          '2026-03-06T21-00-00.000Z--startup.log'
        ),
        'utf8'
      )
    ).resolves.toContain('"currentBeadPriority": "● P2"');
    await expect(
      readFile(
        path.join(
          tempDir,
          'tracking',
          'symphony',
          'runs',
          '2026-03-06T21-00-00.000Z--startup.log'
        ),
        'utf8'
      )
    ).resolves.toContain(
      '"lastPollSummary": "1 ready bead(s): dadeto-639o (● P2) Implement Symphony tracker polling and bead selection loop"'
    );
    await expect(
      readFile(
        path.join(
          tempDir,
          'tracking',
          'symphony',
          'runs',
          '2026-03-06T21-00-00.000Z--startup.log'
        ),
        'utf8'
      )
    ).resolves.toContain(
      '"operatorRecommendation": "Run the next worker loop on dadeto-639o."'
    );
    await expect(
      readFile(
        path.join(
          tempDir,
          'tracking',
          'symphony',
          'runs',
          '2026-03-06T21-00-00.000Z--startup.log'
        ),
        'utf8'
      )
    ).resolves.toContain(
      'dadeto-639o (● P2) Implement Symphony tracker polling and bead selection loop'
    );
  });

  test('bootstraps idle status with an operator recommendation when no beads are ready', async () => {
    await mkdir(path.join(tempDir, 'tracking'), { recursive: true });
    await writeFile(
      path.join(tempDir, 'tracking', 'symphony.local.json'),
      JSON.stringify({
        tracker: {
          kind: 'bd',
          readyCommand: 'bd ready --sort priority',
        },
        logDir: 'tracking/symphony',
      }),
      'utf8'
    );
    await writeFile(
      path.join(tempDir, 'WORKFLOW.md'),
      ['# Workflow', '', '## Allowed command families', '- `bd`'].join('\n'),
      'utf8'
    );

    const { status } = await bootstrapSymphony({
      repoRoot: tempDir,
      now: () => new Date('2026-03-06T22:00:00.000Z'),
      trackerFactory: () => ({
        async pollReadyBeads() {
          return {
            command: 'bd ready --sort priority',
            readyBeads: [],
            queueSummary: [],
            selectedBead: null,
          };
        },
      }),
    });

    expect(status.state).toBe('idle');
    expect(status.operatorRecommendation).toBe(
      'Create or refresh the next bead before starting another runner loop.'
    );
    await expect(
      readFile(
        path.join(tempDir, 'tracking', 'symphony', 'status.json'),
        'utf8'
      )
    ).resolves.toContain(
      '"operatorRecommendation": "Create or refresh the next bead before starting another runner loop."'
    );
  });

  test('persists one completed and one blocked runner outcome as scheduler-visible status', async () => {
    const statusStore = createSymphonyStatusStore({
      statusPath: path.join(tempDir, 'tracking', 'symphony', 'status.json'),
      logDir: path.join(tempDir, 'tracking', 'symphony'),
    });

    const completedStatus = applyRunnerOutcome(
      {
        service: 'dadeto-local-symphony',
        startedAt: '2026-03-06T23:00:00.000Z',
        state: 'ready',
        currentBeadId: 'dadeto-639o',
        currentBeadTitle: 'First',
        currentBeadPriority: '● P2',
        queueEvidence: ['dadeto-639o (● P2) First'],
      },
      {
        beadId: 'dadeto-639o',
        beadTitle: 'First',
        outcome: 'completed',
        summary: 'Closed bead and pushed changes.',
      }
    );

    await statusStore.writeStatus(completedStatus);

    await expect(statusStore.readStatus()).resolves.toMatchObject({
      state: 'idle',
      currentBeadId: null,
      operatorRecommendation:
        'Refresh the queue and choose the next ready bead before launching another runner loop.',
      lastOutcome: {
        beadId: 'dadeto-639o',
        outcome: 'completed',
      },
    });

    const blockedStatus = applyRunnerOutcome(
      {
        ...completedStatus,
        startedAt: '2026-03-06T23:10:00.000Z',
        currentBeadId: 'dadeto-abcd',
        currentBeadTitle: 'Blocked bead',
        currentBeadPriority: '● P2',
      },
      {
        beadId: 'dadeto-abcd',
        beadTitle: 'Blocked bead',
        outcome: 'blocked',
        summary: 'Waiting on clarified workflow guidance.',
      }
    );

    await statusStore.writeStatus(blockedStatus);

    await expect(statusStore.readStatus()).resolves.toMatchObject({
      state: 'blocked',
      currentBeadId: 'dadeto-abcd',
      operatorRecommendation:
        'Inspect the blocker, update the bead or workflow guidance, and only then launch another runner loop.',
      queueEvidence: ['dadeto-abcd: Waiting on clarified workflow guidance.'],
      lastOutcome: {
        beadId: 'dadeto-abcd',
        outcome: 'blocked',
      },
    });
  });
});
