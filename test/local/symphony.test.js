import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { bootstrapSymphony } from '../../src/local/symphony/bootstrap.js';
import { loadSymphonyConfig } from '../../src/local/symphony/config.js';
import { loadSymphonyWorkflow } from '../../src/local/symphony/workflow.js';

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

    expect(config.workspaceRoot).toBe(
      path.join(tempDir, '.worktrees', 'symphony')
    );
    expect(config.statusPath).toBe(
      path.join(tempDir, 'tracking', 'symphony', 'status.json')
    );
    expect(config.pollIntervalMs).toBe(45000);
  });

  test('summarizes workflow policy sections when WORKFLOW.md exists', async () => {
    await writeFile(
      path.join(tempDir, 'WORKFLOW.md'),
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
      ].join('\n'),
      'utf8'
    );

    const workflow = await loadSymphonyWorkflow({ repoRoot: tempDir });

    expect(workflow.exists).toBe(true);
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
    await expect(
      readFile(
        path.join(tempDir, 'tracking', 'symphony', 'status.json'),
        'utf8'
      )
    ).resolves.toContain('"state": "blocked"');
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
      '# Workflow\n\n## Allowed command families\n- `bd`\n',
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
    ).resolves.toContain('dadeto-639o (● P2) Implement Symphony tracker polling and bead selection loop');
  });
});
