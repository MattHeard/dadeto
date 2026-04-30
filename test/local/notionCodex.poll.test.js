import { runNotionCodexPoll } from '../../src/local/notion-codex/poll.js';

const config = {
  notion: {
    dadetoPageId: 'page-id',
    dadetoPageUrl: 'https://notion.example/page-id',
    taskDataSourceUrl: 'collection://tasks',
    taskContext: 'At lorandil',
    taskStatus: 'Not Started',
    messageSearchQuery: 'codex',
    inboxPageIds: ['inbox-page'],
  },
};

describe('local notion codex poll runner', () => {
  test('builds a dry-run prompt without launching or writing state', async () => {
    const writes = [];
    const launches = [];
    const result = await runNotionCodexPoll({
      config,
      repoRoot: '/tmp/repo',
      now: new Date('2026-04-30T07:45:00.000Z'),
      dryRun: true,
      stateStore: {
        async readState() {
          return { activeRun: null, eventLog: [] };
        },
        async writeState(state) {
          writes.push(state);
        },
      },
      launcher: {
        async launch(payload) {
          launches.push(payload);
          return { pid: 123 };
        },
      },
    });

    expect(result).toMatchObject({
      launched: false,
      dryRun: true,
      runId: '2026-04-30T07:45:00.000Z--notion-codex',
    });
    expect(result.prompt).toContain('Handle at most one unread Notion message');
    expect(result.prompt).toContain('collection://tasks');
    expect(result.prompt).toContain('Context includes "At lorandil"');
    expect(writes).toEqual([]);
    expect(launches).toEqual([]);
  });

  test('skips launching when an active run is still alive', async () => {
    const writes = [];
    const result = await runNotionCodexPoll({
      config,
      repoRoot: '/tmp/repo',
      now: new Date('2026-04-30T07:46:00.000Z'),
      isProcessAliveImpl: () => true,
      stateStore: {
        async readState() {
          return {
            activeRun: {
              runId: 'existing-run',
              pid: 777,
            },
            eventLog: [],
          };
        },
        async writeState(state) {
          writes.push(state);
        },
      },
      launcher: {
        async launch() {
          throw new Error('should not launch');
        },
      },
    });

    expect(result).toMatchObject({
      launched: false,
      skipped: true,
      reason: 'active-run',
      runId: 'existing-run',
    });
    expect(writes).toEqual([]);
  });

  test('records a launched run after clearing a completed active run', async () => {
    const writes = [];
    const launchPayloads = [];
    const result = await runNotionCodexPoll({
      config,
      repoRoot: '/tmp/repo',
      now: new Date('2026-04-30T07:47:00.000Z'),
      isProcessAliveImpl: () => false,
      stateStore: {
        async readState() {
          return {
            activeRun: {
              runId: 'old-run',
              pid: 778,
            },
            eventLog: [],
          };
        },
        async writeState(state) {
          writes.push(state);
        },
      },
      launcher: {
        async launch(payload) {
          launchPayloads.push(payload);
          return {
            launcherKind: 'codex',
            command: 'codex',
            args: ['exec', payload.prompt],
            pid: 779,
            stdoutPath: '/tmp/stdout.log',
            stderrPath: '/tmp/stderr.log',
          };
        },
      },
    });

    expect(result.launched).toBe(true);
    expect(launchPayloads).toHaveLength(1);
    expect(writes).toHaveLength(1);
    expect(writes[0].activeRun).toMatchObject({
      runId: '2026-04-30T07:47:00.000Z--notion-codex',
      pid: 779,
    });
    expect(writes[0].eventLog).toEqual([
      {
        at: '2026-04-30T07:47:00.000Z',
        type: 'completed',
        runId: 'old-run',
        pid: 778,
      },
      {
        at: '2026-04-30T07:47:00.000Z',
        type: 'launched',
        runId: '2026-04-30T07:47:00.000Z--notion-codex',
        pid: 779,
      },
    ]);
  });
});
